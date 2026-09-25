import {
    ClientRequestConfig,
    RequestPatcher,
    attachmentFilename,
    executeRequest,
    responseToBufferLike,
    toUint8Array
} from "./shared.js";
import { BufferLike, VaultID } from "../../types.js";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const MIME_FOLDER = "application/vnd.google-apps.folder";
const ATTACHMENTS_FOLDER = ".buttercup";

export interface GoogleDriveAttachmentClient {
    patcher: RequestPatcher;
}

/**
 * Google Drive attachment storage. Drive is ID-based, and some Buttercup
 * clients (eg. the browser extension) authorise with the `drive.file` scope,
 * which only grants access to files the app created itself - so rather than
 * placing attachments next to the vault file (whose folder the app may not
 * be able to see), they're kept in folders Buttercup creates itself:
 * `/.buttercup/<vault ID>/<attachment ID>.bcatt` in the root of the Drive.
 */
export class GoogleDriveAttachments {
    protected _client: GoogleDriveAttachmentClient;
    protected _folderIDs: Map<string, Promise<string | null>> = new Map();
    protected _token: string;

    constructor(client: GoogleDriveAttachmentClient, token: string) {
        this._client = client;
        this._token = token;
    }

    async getAttachment(vaultID: VaultID, attachmentID: string): Promise<BufferLike> {
        const folderID = await this._getVaultFolderID(vaultID, false);
        const fileID = folderID
            ? await this._findItem(attachmentFilename(attachmentID), folderID, false)
            : null;
        if (!fileID) {
            throw new Error(`Attachment not found: ${attachmentID}`);
        }
        const response = await this._request(
            {
                method: "GET",
                url: `${FILES_URL}/${encodeURIComponent(fileID)}`,
                query: { alt: "media", supportsAllDrives: "true" }
            },
            "Failed downloading Google Drive attachment"
        );
        return responseToBufferLike(response);
    }

    async putAttachment(vaultID: VaultID, attachmentID: string, data: BufferLike): Promise<void> {
        // Created if missing, so never null here
        const folderID = (await this._getVaultFolderID(vaultID, true))!;
        const filename = attachmentFilename(attachmentID);
        const existingID = await this._findItem(filename, folderID, false);
        if (existingID) {
            await this._request(
                {
                    method: "PATCH",
                    url: `${UPLOAD_URL}/${encodeURIComponent(existingID)}`,
                    query: { uploadType: "media", supportsAllDrives: "true" },
                    headers: { "Content-Type": "application/octet-stream" },
                    body: toUint8Array(data)
                },
                "Failed updating Google Drive attachment"
            );
            return;
        }
        const { body, contentType } = buildMultipartUpload(
            { name: filename, parents: [folderID] },
            toUint8Array(data)
        );
        await this._request(
            {
                method: "POST",
                url: UPLOAD_URL,
                query: { uploadType: "multipart", supportsAllDrives: "true" },
                headers: { "Content-Type": contentType },
                body
            },
            "Failed uploading Google Drive attachment"
        );
    }

    async removeAttachment(vaultID: VaultID, attachmentID: string): Promise<void> {
        const folderID = await this._getVaultFolderID(vaultID, false);
        const fileID = folderID
            ? await this._findItem(attachmentFilename(attachmentID), folderID, false)
            : null;
        if (!fileID) {
            throw new Error(`Attachment not found: ${attachmentID}`);
        }
        await this._request(
            {
                method: "DELETE",
                url: `${FILES_URL}/${encodeURIComponent(fileID)}`,
                query: { supportsAllDrives: "true" }
            },
            "Failed removing Google Drive attachment"
        );
    }

    /**
     * Update the access token (after re-authentication)
     */
    updateClient(client: GoogleDriveAttachmentClient, token: string) {
        this._client = client;
        this._token = token;
    }

    /**
     * Find an item by name within a parent folder
     * @returns The item ID, or null if not found
     */
    protected async _findItem(
        name: string,
        parentID: string,
        folder: boolean
    ): Promise<string | null> {
        const conditions = [
            `name = '${escapeQueryValue(name)}'`,
            `'${escapeQueryValue(parentID)}' in parents`,
            "trashed = false",
            folder ? `mimeType = '${MIME_FOLDER}'` : `mimeType != '${MIME_FOLDER}'`
        ];
        const response = await this._request(
            {
                method: "GET",
                url: FILES_URL,
                query: {
                    q: conditions.join(" and "),
                    fields: "files(id)",
                    spaces: "drive",
                    pageSize: "10"
                }
            },
            "Failed searching Google Drive"
        );
        const { files = [] } = (await response.json()) as { files: Array<{ id: string }> };
        return files.length > 0 ? files[0].id : null;
    }

    protected async _findOrCreateFolder(
        name: string,
        parentID: string,
        create: boolean
    ): Promise<string | null> {
        const existing = await this._findItem(name, parentID, true);
        if (existing || !create) return existing;
        const response = await this._request(
            {
                method: "POST",
                url: FILES_URL,
                query: { fields: "id", supportsAllDrives: "true" },
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, mimeType: MIME_FOLDER, parents: [parentID] })
            },
            "Failed creating Google Drive folder"
        );
        const { id } = (await response.json()) as { id: string };
        return id;
    }

    /**
     * Get the ID of the attachments folder for a vault. Lookups are cached
     * (including in-flight ones, so parallel uploads don't create duplicate
     * folders); misses aren't, as the folder may be created later.
     */
    protected _getVaultFolderID(vaultID: VaultID, create: boolean): Promise<string | null> {
        if (this._folderIDs.has(vaultID)) {
            return this._folderIDs.get(vaultID)!;
        }
        const lookup = (async () => {
            const rootFolderID = await this._findOrCreateFolder(ATTACHMENTS_FOLDER, "root", create);
            if (!rootFolderID) return null;
            return this._findOrCreateFolder(vaultID, rootFolderID, create);
        })();
        this._folderIDs.set(vaultID, lookup);
        lookup.then(
            (id) => {
                if (!id) this._folderIDs.delete(vaultID);
            },
            () => this._folderIDs.delete(vaultID)
        );
        return lookup;
    }

    protected _request(config: ClientRequestConfig, description: string) {
        return executeRequest(
            this._client.patcher,
            {
                ...config,
                headers: {
                    ...(config.headers || {}),
                    Authorization: `Bearer ${this._token}`
                }
            },
            description
        );
    }
}

/**
 * Build a multipart/related upload body (metadata + binary content) as raw
 * bytes. The metadata is ASCII (IDs and "<uuid>.bcatt" names), so no text
 * encoder or Buffer is needed - this works the same in NodeJS, browsers and
 * React Native.
 */
export function buildMultipartUpload(
    metadata: object,
    content: Uint8Array
): { body: Uint8Array; contentType: string } {
    const boundary = `BCUP_ATT_${Math.floor(Math.random() * 1e9)}`;
    const head = asciiBytes(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    const tail = asciiBytes(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.length + content.length + tail.length);
    body.set(head, 0);
    body.set(content, head.length);
    body.set(tail, head.length + content.length);
    return {
        body,
        contentType: `multipart/related; boundary=${boundary}`
    };
}

function asciiBytes(text: string): Uint8Array {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        if (code > 0x7f) {
            throw new Error("Unexpected non-ASCII character in multipart upload metadata");
        }
        bytes[i] = code;
    }
    return bytes;
}

function escapeQueryValue(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
