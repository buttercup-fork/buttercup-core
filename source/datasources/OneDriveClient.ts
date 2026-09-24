import { fetch } from "@buttercup/fetch";
import { Layerr } from "layerr";

export const ONEDRIVE_GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";

/**
 * A OneDrive file, referenced either by its drive item ID or by its path
 * relative to the root of the user's drive
 */
export interface OneDriveFileTarget {
    fileID?: string;
    path?: string;
}

/**
 * Minimal Microsoft Graph client for reading and writing a single OneDrive
 * file - just what a vault datasource needs
 */
export class OneDriveClient {
    endpoint: string;
    token: string;

    constructor(token: string, endpoint: string = ONEDRIVE_GRAPH_ENDPOINT) {
        this.token = token;
        this.endpoint = endpoint.replace(/\/+$/, "");
    }

    /**
     * Get the text contents of a file
     * @param target The file to read
     * @returns A promise that resolves with the file contents
     */
    async getFileContents(target: OneDriveFileTarget): Promise<string> {
        // Graph responds to /content with a 302 to a pre-authenticated
        // download URL, which fetch follows
        const response = await this._request("GET", this._contentURL(target));
        return response.text();
    }

    /**
     * Write the text contents of a file, creating it if a path is used and
     * it doesn't exist yet
     * @param target The file to write
     * @param contents The new file contents
     */
    async putFileContents(target: OneDriveFileTarget, contents: string): Promise<void> {
        await this._request("PUT", this._contentURL(target), contents);
    }

    _contentURL(target: OneDriveFileTarget): string {
        const { fileID, path } = target;
        if (fileID) {
            return `${this.endpoint}/me/drive/items/${encodeURIComponent(fileID)}/content`;
        }
        if (path) {
            const encodedPath = path
                .split("/")
                .filter((segment) => segment.length > 0)
                .map((segment) => encodeURIComponent(segment))
                .join("/");
            if (!encodedPath) {
                throw new Layerr(`Invalid OneDrive file path: ${path}`);
            }
            return `${this.endpoint}/me/drive/root:/${encodedPath}:/content`;
        }
        throw new Layerr("No OneDrive file ID or path specified");
    }

    async _request(method: string, url: string, body?: string) {
        const headers: { [key: string]: string } = {
            Authorization: `Bearer ${this.token}`
        };
        if (typeof body === "string") {
            // Vault contents are text - never let Graph guess the type
            headers["Content-Type"] = "text/plain";
        }
        const response = await fetch(url, { method, headers, body });
        if (!response.ok) {
            throw new Layerr(
                {
                    info: {
                        authFailure: response.status === 401,
                        status: response.status
                    }
                },
                `OneDrive request failed (${method}): ${response.status} ${response.statusText}`
            );
        }
        return response;
    }
}
