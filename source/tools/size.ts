import { Layerr } from "layerr";
import { ErrorCode } from "./error.js";

/**
 * The parts of a fetch Response that a size-limited read uses
 */
export interface SizeLimitedResponse {
    arrayBuffer(): Promise<ArrayBuffer>;
    body?: ReadableStream<Uint8Array> | null;
    headers: {
        get(name: string): string | null;
    };
}

/**
 * Create the error for data over a size limit
 * @param maxSize The limit in bytes
 * @param description What was too large (eg. "WebDAV download")
 */
export function dataTooLargeError(maxSize: number, description: string): Layerr {
    return new Layerr(
        { info: { code: ErrorCode.DataTooLarge, maxSize } },
        `${description} is larger than the limit of ${maxSize} bytes`
    );
}

/**
 * The size of upload data in bytes
 * @param data A string (sent as UTF-8) or binary data
 */
export function dataSize(data: string | ArrayBuffer | ArrayBufferView): number {
    if (typeof data !== "string") {
        return data.byteLength;
    }
    return new TextEncoder().encode(data).byteLength;
}

/**
 * Check that upload data is within a size limit
 * @param data The data to upload
 * @param maxSize The limit in bytes
 * @param description What is being uploaded, for the error message
 * @throws {Layerr} With info code `DATA_TOO_LARGE` when over the limit
 */
export function assertDataSize(
    data: string | ArrayBuffer | ArrayBufferView,
    maxSize: number,
    description: string
): void {
    if (typeof data === "string") {
        // UTF-8 never uses fewer bytes than the string has UTF-16 code units,
        // and never more than 3 bytes per unit: skip encoding when it can't matter
        if (data.length > maxSize) throw dataTooLargeError(maxSize, description);
        if (data.length * 3 <= maxSize) return;
    }
    if (dataSize(data) > maxSize) {
        throw dataTooLargeError(maxSize, description);
    }
}

/**
 * Read a response body, stopping as soon as it passes a size limit, so a
 * server can't fill the app's memory. A declared Content-Length over the
 * limit is refused before reading. Where the body is not a stream (React
 * Native), the declared length is the only check before the body is read.
 * @param response The response to read
 * @param maxSize The limit in bytes
 * @param abort Called to abort the request when the limit is passed
 * @param description What is being downloaded, for the error message
 * @returns The body
 * @throws {Layerr} With info code `DATA_TOO_LARGE` when over the limit
 */
export async function readResponseWithLimit(
    response: SizeLimitedResponse,
    maxSize: number,
    abort: () => void,
    description: string
): Promise<ArrayBuffer> {
    const declared = response.headers.get("content-length");
    if (declared !== null && Number(declared) > maxSize) {
        abort();
        // Release the unread body too, or the connection stays busy
        if (response.body && typeof response.body.cancel === "function") {
            await response.body.cancel().catch(() => {});
        }
        throw dataTooLargeError(maxSize, description);
    }
    if (!response.body || typeof response.body.getReader !== "function") {
        const data = await response.arrayBuffer();
        if (data.byteLength > maxSize) {
            throw dataTooLargeError(maxSize, description);
        }
        return data;
    }
    const reader = response.body.getReader();
    const chunks: Array<Uint8Array> = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxSize) {
            abort();
            await reader.cancel().catch(() => {});
            throw dataTooLargeError(maxSize, description);
        }
        chunks.push(value);
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return output.buffer;
}
