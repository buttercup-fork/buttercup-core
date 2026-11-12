import { AuthType, WebDAVClient } from "webdav";
import type { createClient as createWebDAVClient } from "webdav";
import pathPosix from "path-posix";
import { TextDatasource } from "./TextDatasource.js";
import { fireInstantiationHandlers, registerDatasource } from "./register.js";
import { getSharedAppEnv } from "../env/appEnv.js";
import { Credentials } from "../credentials/Credentials.js";
import { getCredentials } from "../credentials/memory/credentials.js";
import { ATTACHMENT_EXT, assertAttachmentStorageIDs } from "../tools/attachments.js";
import { assertDataSize, readResponseWithLimit } from "../tools/size.js";
import { ErrorCode } from "../tools/error.js";
import { Layerr } from "layerr";
import {
    AttachmentDetails,
    BufferLike,
    DatasourceConfigurationWebDAV,
    DatasourceLoadedData,
    History,
    VaultID
} from "../types.js";

const MAX_DATA_SIZE = 200 * 1024 * 1024; // 200 MB
// Hosts where plain http stays on this computer
const LOOPBACK_HOST = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i;

/**
 * Check whether a WebDAV endpoint would send the account password
 * unencrypted: plain `http` to a host other than this computer (B-684)
 * @param endpoint The endpoint URL
 * @returns True if insecure
 * @private
 */
function isInsecureEndpoint(endpoint: string): boolean {
    try {
        const url = new URL(endpoint);
        return url.protocol === "http:" && !LOOPBACK_HOST.test(url.hostname);
    } catch (err) {
        // Not a URL (the client can't connect to it either), or a platform
        // whose URL lacks these properties (React Native without a polyfill:
        // not checked, B-684)
        return false;
    }
}

/**
 * WebDAV datasource for reading and writing remote archives
 * @augments TextDatasource
 * @memberof module:Buttercup
 */
export default class WebDAVDatasource extends TextDatasource {
    protected _client: WebDAVClient;
    private _config: DatasourceConfigurationWebDAV;
    /**
     * Largest vault or attachment, in bytes, that is downloaded or uploaded.
     * The webdav client ignores its own maxBodyLength and maxContentLength
     * options (webdav 5.11), so the datasource enforces the limit itself.
     */
    protected _maxDataSize: number = MAX_DATA_SIZE;
    protected _path: string;

    /**
     * Constructor for the datasource
     * @param credentials Credentials for the datasource
     */
    constructor(credentials: Credentials) {
        super(credentials);
        const { data: credentialData } = getCredentials(credentials.id)!;
        const { datasource: datasourceConfig } = credentialData as {
            datasource: DatasourceConfigurationWebDAV;
        };
        const {
            allowInsecure = false,
            endpoint,
            password,
            path,
            username
        } = (this._config = datasourceConfig);
        if (isInsecureEndpoint(endpoint) && allowInsecure !== true) {
            // Refused before a client exists, so nothing is sent
            throw new Layerr(
                { info: { code: ErrorCode.InsecureEndpoint } },
                "WebDAV endpoint uses unencrypted http: the password would be sent in clear text (allow it with allowInsecure)"
            );
        }
        this._path = path;
        const createClient = getSharedAppEnv().getProperty(
            "net/webdav/v1/newClient"
        ) as typeof createWebDAVClient;
        if (typeof username === "string" && typeof password === "string") {
            this._client = createClient(endpoint, {
                authType: AuthType.Auto,
                username,
                password,
                maxBodyLength: MAX_DATA_SIZE,
                maxContentLength: MAX_DATA_SIZE
            });
        } else {
            this._client = createClient(endpoint, {
                maxBodyLength: MAX_DATA_SIZE,
                maxContentLength: MAX_DATA_SIZE
            });
        }
        this.type = "webdav";
        fireInstantiationHandlers("webdav", this);
    }

    /**
     * The vault file's base directory
     * @memberof WebDAVDatasource
     */
    get baseDir() {
        return pathPosix.dirname(this.path);
    }

    /**
     * The WebDAV client instance
     * @memberof WebDAVDatasource
     */
    get client() {
        return this._client;
    }

    /**
     * The remote archive path
     * @memberof WebDAVDatasource
     */
    get path() {
        return this._path;
    }

    /**
     * Ensure attachment paths exist
     * @memberof WebDAVDatasource
     * @protected
     */
    async _ensureAttachmentsPaths(vaultID: VaultID): Promise<void> {
        assertAttachmentStorageIDs(vaultID);
        const attachmentsDir = pathPosix.join(this.baseDir, ".buttercup", vaultID);
        await this.client.createDirectory(attachmentsDir, { recursive: true });
    }

    /**
     * Download a file, refusing it once it passes the size limit. Made with
     * the client's customRequest, which builds the URL, authentication and
     * status check the same way as its getFileContents.
     * @param path The remote path
     * @param description What is downloaded, for the error message
     * @param headers Extra request headers
     * @memberof WebDAVDatasource
     * @protected
     */
    async _getFileContentsLimited(
        path: string,
        description: string,
        headers: Record<string, string> = {}
    ): Promise<ArrayBuffer> {
        const controller = new AbortController();
        const response = await this.client.customRequest(path, {
            method: "GET",
            headers,
            signal: controller.signal
        });
        return readResponseWithLimit(
            response,
            this._maxDataSize,
            () => controller.abort(),
            description
        );
    }

    /**
     * Get encrypted attachment
     * - Loads the attachment contents from a file into a buffer
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof WebDAVDatasource
     */
    async getAttachment(vaultID: VaultID, attachmentID: string): Promise<BufferLike> {
        assertAttachmentStorageIDs(vaultID, attachmentID);
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = pathPosix.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        const data = await this._getFileContentsLimited(attachmentPath, "WebDAV attachment");
        const convert = getSharedAppEnv().getProperty("encoding/v1/arrayBufferToBufferLike");
        return convert(data);
    }

    /**
     * Get the datasource configuration
     * @memberof WebDAVDatasource
     */
    getConfiguration(): DatasourceConfigurationWebDAV {
        return this._config;
    }

    /**
     * Load archive history from the datasource
     * @param credentials The credentials for archive decryption
     * @returns A promise resolving archive history
     * @memberof WebDAVDatasource
     */
    load(credentials: Credentials): Promise<DatasourceLoadedData> {
        return this.hasContent
            ? super.load(credentials)
            : this._getFileContentsLimited(this.path, "WebDAV vault", {
                  // As the client's getFileContents sends for text
                  Accept: "text/plain"
              }).then((data) => {
                  this.setContent(new TextDecoder().decode(data));
                  return super.load(credentials);
              });
    }

    /**
     * Put attachment data
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @param buffer The attachment data
     * @param details The attachment details
     * @memberof WebDAVDatasource
     */
    async putAttachment(
        vaultID: VaultID,
        attachmentID: string,
        buffer: BufferLike,
        details: AttachmentDetails
    ): Promise<void> {
        assertAttachmentStorageIDs(vaultID, attachmentID);
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = pathPosix.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        assertDataSize(buffer, this._maxDataSize, "WebDAV attachment");
        await this.client.putFileContents(attachmentPath, buffer);
    }

    /**
     * Remove an attachment
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof WebDAVDatasource
     */
    async removeAttachment(vaultID: VaultID, attachmentID: string): Promise<void> {
        assertAttachmentStorageIDs(vaultID, attachmentID);
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = pathPosix.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        await this.client.deleteFile(attachmentPath);
    }

    /**
     * Save archive contents to the WebDAV service
     * @param history Archive history
     * @param credentials The credentials for encryption
     * @returns A promise resolving when the save is complete
     * @memberof WebDAVDatasource
     */
    async save(history: History, credentials: Credentials): Promise<any> {
        const content = await super.save(history, credentials);
        assertDataSize(content, this._maxDataSize, "WebDAV vault");
        await this.client.putFileContents(this.path, content);
    }

    /**
     * Whether or not the datasource supports attachments
     * @memberof WebDAVDatasource
     */
    supportsAttachments(): boolean {
        return true;
    }

    /**
     * Whether or not the datasource supports bypassing remote fetch operations
     * @returns True if content can be set to bypass fetch operations,
     *  false otherwise
     * @memberof WebDAVDatasource
     */
    supportsRemoteBypass(): boolean {
        return true;
    }
}

registerDatasource("webdav", WebDAVDatasource);
