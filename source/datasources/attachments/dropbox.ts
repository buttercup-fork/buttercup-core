import pathPosix from "path-posix";
import {
    ClientRequestConfig,
    RequestPatcher,
    attachmentFilename,
    executeRequest,
    responseToBufferLike
} from "./shared.js";
import { BufferLike, VaultID } from "../../types.js";

const DOWNLOAD_URL = "https://content.dropboxapi.com/2/files/download";

export interface DropboxAttachmentClient {
    patcher: RequestPatcher;
    /**
     * @buttercup/dropbox-client's config - `compat` mode (used in browsers)
     * passes the token in the query string instead of a header
     */
    _config?: {
        compat?: boolean;
        headers?: Record<string, string>;
    };
    delete(path: string): Promise<void>;
    putFileContents(path: string, data: any): Promise<void>;
}

/**
 * Attachments are stored like FileDatasource/WebDAVDatasource attachments:
 * `<vault directory>/.buttercup/<vault ID>/<attachment ID>.bcatt`
 */
export function getDropboxAttachmentPath(
    vaultPath: string,
    vaultID: VaultID,
    attachmentID: string
): string {
    return pathPosix.join(
        pathPosix.dirname(vaultPath),
        ".buttercup",
        vaultID,
        attachmentFilename(attachmentID)
    );
}

export async function getDropboxAttachment(
    client: DropboxAttachmentClient,
    token: string,
    path: string
): Promise<BufferLike> {
    // @buttercup/dropbox-client only downloads text, so binary downloads are
    // made here - through the client's own request method - mirroring its
    // getFileContents request
    const { compat = false, headers = {} } = client._config || {};
    const arg = dropboxAPIArg({ path });
    const config: ClientRequestConfig = compat
        ? {
              method: "GET",
              url: DOWNLOAD_URL,
              headers: { ...headers },
              query: {
                  arg,
                  authorization: `Bearer ${token}`,
                  reject_cors_preflight: "true"
              }
          }
        : {
              method: "GET",
              url: DOWNLOAD_URL,
              headers: {
                  ...headers,
                  "Authorization": `Bearer ${token}`,
                  "Dropbox-API-Arg": arg
              },
              query: {}
          };
    const response = await executeRequest(
        client.patcher,
        config,
        "Failed downloading Dropbox attachment"
    );
    return responseToBufferLike(response);
}

export async function putDropboxAttachment(
    client: DropboxAttachmentClient,
    path: string,
    data: BufferLike
): Promise<void> {
    // Uploads are sent as application/octet-stream, and Dropbox creates any
    // missing parent folders
    await client.putFileContents(path, data);
}

export async function removeDropboxAttachment(
    client: DropboxAttachmentClient,
    path: string
): Promise<void> {
    await client.delete(path);
}

/**
 * JSON for the Dropbox-API-Arg header/parameter - headers must be ASCII, so
 * non-ASCII characters (eg. in folder names) are escaped
 */
function dropboxAPIArg(value: object): string {
    return JSON.stringify(value).replace(
        /[\u007f-￿]/g,
        (char) => `\\u${`000${char.charCodeAt(0).toString(16)}`.slice(-4)}`
    );
}
