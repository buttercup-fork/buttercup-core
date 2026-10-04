import fs from "fs";
import path from "path";
import pify from "pify";
import { TextDatasource } from "./TextDatasource.js";
import { fireInstantiationHandlers, registerDatasource } from "./register.js";
import { Credentials } from "../credentials/Credentials.js";
import { getCredentials } from "../credentials/memory/credentials.js";
import { ATTACHMENT_EXT } from "../tools/attachments.js";
import {
    AttachmentDetails,
    BufferLike,
    DatasourceConfigurationFile,
    DatasourceLoadedData,
    EncryptedContent,
    History,
    VaultID
} from "../types.js";

const RENAME_ATTEMPTS = 10;

function isAccessError(err: unknown): boolean {
    const { code } = err as NodeJS.ErrnoException;
    return code === "EPERM" || code === "EACCES" || code === "EBUSY";
}

/**
 * Rename a file over another one. On Windows a virus scanner, indexer or sync
 * tool may briefly hold the target open, so retry for a moment.
 */
async function renameReplacing(source: string, target: string): Promise<void> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            await fs.promises.rename(source, target);
            return;
        } catch (err) {
            if (!isAccessError(err) || process.platform !== "win32" || attempt >= RENAME_ATTEMPTS) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, attempt * 50));
        }
    }
}

/**
 * File datasource for loading and saving files
 * @augments TextDatasource
 * @memberof module:Buttercup
 */
export class FileDatasource extends TextDatasource {
    _filename: string;
    mkdir: Function;
    readFile: Function;
    stat: Function;
    unlink: Function;
    writeFile: Function;

    /**
     * Constructor for the file datasource
     * @param credentials The credentials instance with which to
     *  use to configure the datasource
     */
    constructor(credentials: Credentials) {
        super(credentials);
        const { data: credentialData } = getCredentials(credentials.id)!;
        const { datasource: datasourceConfig } = credentialData as {
            datasource: DatasourceConfigurationFile;
        };
        const { path } = datasourceConfig;
        this._filename = path;
        this.mkdir = pify(fs.mkdir);
        this.readFile = pify(fs.readFile);
        this.stat = pify(fs.stat);
        this.unlink = pify(fs.unlink);
        this.writeFile = pify(fs.writeFile);
        this.type = "file";
        fireInstantiationHandlers("file", this);
    }

    get baseDir(): string {
        return path.dirname(this.path);
    }

    /**
     * The file path
     * @memberof FileDatasource
     */
    get path() {
        return this._filename;
    }

    /**
     * Ensure attachment paths exist
     * @memberof FileDatasource
     * @protected
     */
    async _ensureAttachmentsPaths(vaultID: VaultID): Promise<void> {
        const attachmentsDir = path.join(this.baseDir, ".buttercup", vaultID);
        await this.mkdir(attachmentsDir, { recursive: true });
    }

    /**
     * Get encrypted attachment
     * - Loads the attachment contents from a file into a buffer
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof FileDatasource
     */
    async getAttachment(vaultID: VaultID, attachmentID: string): Promise<BufferLike> {
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = path.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        return this.readFile(attachmentPath);
    }

    /**
     * Get the datasource configuration
     * @memberof FileDatasource
     */
    getConfiguration(): DatasourceConfigurationFile {
        return {
            type: "file",
            path: this._filename
        };
    }

    /**
     * Load from the filename specified in the constructor using a password
     * @param credentials The credentials for decryption
     * @returns A promise resolving with archive history
     * @memberof FileDatasource
     */
    async load(credentials: Credentials): Promise<DatasourceLoadedData> {
        if (this.hasContent) {
            return super.load(credentials);
        }
        const contents = await this.readFile(this.path, "utf8");
        this.setContent(contents);
        return super.load(credentials);
    }

    /**
     * Put attachment data
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @param buffer The attachment data
     * @param details The attachment details
     * @memberof FileDatasource
     */
    async putAttachment(
        vaultID: VaultID,
        attachmentID: string,
        buffer: BufferLike,
        details: AttachmentDetails
    ): Promise<void> {
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = path.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        await this.writeFile(attachmentPath, buffer);
    }

    /**
     * Remove an attachment
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof FileDatasource
     */
    async removeAttachment(vaultID: VaultID, attachmentID: string): Promise<void> {
        await this._ensureAttachmentsPaths(vaultID);
        const attachmentPath = path.join(
            this.baseDir,
            ".buttercup",
            vaultID,
            `${attachmentID}.${ATTACHMENT_EXT}`
        );
        await this.unlink(attachmentPath);
    }

    /**
     * Save archive history to a file
     * @param history The archive history to save
     * @param credentials The credentials to save with
     * @returns A promise that resolves when saving is complete
     * @memberof FileDatasource
     */
    save(history: History, credentials: Credentials): Promise<EncryptedContent> {
        return super.save(history, credentials).then(async (encrypted) => {
            await this._writeVaultFile(encrypted);
            return encrypted;
        });
    }

    /**
     * Write the vault file without ever leaving it half-written: write a
     * temporary file next to it, flush it to disk and rename it over the
     * vault. Writing the vault in place left it cut off when the app was
     * killed, the power went or a sync tool copied it mid-write, and a cut-off
     * vault no longer unlocks ("Failed deriving key: Salt must be provided",
     * buttercup/buttercup-desktop#1233).
     * @param content The encrypted vault
     * @memberof FileDatasource
     */
    async _writeVaultFile(content: string): Promise<void> {
        const target = this.path;
        let mode: number | undefined;
        try {
            mode = (await fs.promises.stat(target)).mode & 0o777;
            // Still refuse to save over a read-only vault file
            await fs.promises.access(target, fs.constants.W_OK);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
        const tempPath = path.join(
            path.dirname(target),
            `.${path.basename(target)}.${process.pid}-${Date.now()}.tmp`
        );
        try {
            const file = await fs.promises.open(tempPath, "w", mode);
            try {
                await file.writeFile(content, "utf8");
                await file.sync();
            } finally {
                await file.close();
            }
            await renameReplacing(tempPath, target);
        } catch (err) {
            await fs.promises.unlink(tempPath).catch(() => {});
            if (!isAccessError(err)) throw err;
            // The folder doesn't allow new files, or (Windows) another program
            // holds the vault open: write it in place, as before
            await this.writeFile(target, content);
        }
    }

    /**
     * Whether or not the datasource supports attachments
     * @memberof FileDatasource
     */
    supportsAttachments(): boolean {
        return true;
    }

    /**
     * Whether or not the datasource supports bypassing remote fetch operations
     * @returns True if content can be set to bypass fetch operations,
     *  false otherwise
     * @memberof FileDatasource
     */
    supportsRemoteBypass(): boolean {
        return true;
    }
}

registerDatasource("file", FileDatasource);
