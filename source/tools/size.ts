import { Layerr } from "layerr";
import { ErrorCode } from "./error.js";

/**
 * A NodeJS stream body (node-fetch's Response): read with `for await`,
 * closed with `destroy`
 */
export interface NodeStreamBody extends AsyncIterable<Uint8Array | string> {
    destroy?(error?: Error): void;
}

/**
 * The parts of a fetch Response that a size-limited read uses
 */
export interface SizeLimitedResponse {
    arrayBuffer(): Promise<ArrayBuffer>;
    body?: ReadableStream<Uint8Array> | NodeStreamBody | null;
    headers: {
        get(name: string): string | null;
    };
}

function isWebStream(body: SizeLimitedResponse["body"]): body is ReadableStream<Uint8Array> {
    return !!body && typeof (body as ReadableStream<Uint8Array>).getReader === "function";
}

function isNodeStream(body: SizeLimitedResponse["body"]): body is NodeStreamBody {
    return !!body && typeof (body as NodeStreamBody)[Symbol.asyncIterator] === "function";
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
 * limit is refused before reading. Reads a web stream (the fetch built into
 * NodeJS and browsers) or a NodeJS stream (node-fetch). Where the body is not
 * a stream (React Native), the declared length is the only check before the
 * body is read.
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
    const { body } = response;
    const declared = response.headers.get("content-length");
    if (declared !== null && Number(declared) > maxSize) {
        abort();
        // Release the unread body too, or the connection stays busy
        if (isWebStream(body)) {
            await body.cancel().catch(() => {});
        } else if (isNodeStream(body) && typeof body.destroy === "function") {
            body.destroy();
        }
        throw dataTooLargeError(maxSize, description);
    }
    const chunks: Array<Uint8Array> = [];
    let total = 0;
    if (isWebStream(body)) {
        const reader = body.getReader();
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
    } else if (isNodeStream(body)) {
        // node-fetch, which webdav uses on NodeJS with upstream's
        // @buttercup/fetch: its arrayBuffer() would read everything (B-831)
        for await (const part of body) {
            const chunk = typeof part === "string" ? new TextEncoder().encode(part) : part;
            total += chunk.byteLength;
            if (total > maxSize) {
                abort();
                if (typeof body.destroy === "function") body.destroy();
                throw dataTooLargeError(maxSize, description);
            }
            chunks.push(chunk);
        }
    } else {
        const data = await response.arrayBuffer();
        if (data.byteLength > maxSize) {
            throw dataTooLargeError(maxSize, description);
        }
        return data;
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return output.buffer;
}
