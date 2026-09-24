import { Layerr } from "layerr";
import { getSharedAppEnv } from "../../env/appEnv.js";
import { ATTACHMENT_EXT } from "../../tools/attachments.js";
import { BufferLike } from "../../types.js";

/**
 * Request configuration as accepted by the "request" hot-patcher method of
 * the Dropbox and Google Drive clients. Attachment requests go through the
 * client's own (patchable) request method, so anything an application has
 * patched there applies to attachments too.
 */
export interface ClientRequestConfig {
    body?: string | ArrayBuffer | Uint8Array;
    headers?: Record<string, string>;
    method: "DELETE" | "GET" | "PATCH" | "POST";
    query?: Record<string, string>;
    url: string;
}

export interface ClientResponse {
    ok: boolean;
    status: number;
    statusText: string;
    arrayBuffer(): Promise<ArrayBuffer>;
    json(): Promise<any>;
}

export interface RequestPatcher {
    execute<T>(key: string, ...args: Array<any>): T;
}

export function attachmentFilename(attachmentID: string): string {
    return `${attachmentID}.${ATTACHMENT_EXT}`;
}

export async function executeRequest(
    patcher: RequestPatcher,
    config: ClientRequestConfig,
    description: string
): Promise<ClientResponse> {
    const response = await patcher.execute<Promise<ClientResponse>>("request", config);
    if (!response.ok) {
        throw new Layerr(
            {
                info: {
                    authFailure: response.status === 401,
                    status: response.status
                }
            },
            `${description}: ${response.status} ${response.statusText}`
        );
    }
    return response;
}

export async function responseToBufferLike(response: ClientResponse): Promise<BufferLike> {
    const convert = getSharedAppEnv().getProperty("encoding/v1/arrayBufferToBufferLike");
    return convert(await response.arrayBuffer());
}

export function toUint8Array(data: BufferLike): Uint8Array {
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    const view = data as Uint8Array;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
