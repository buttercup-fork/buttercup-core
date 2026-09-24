import { GoogleDriveClient } from "@buttercup/googledrive-client";
import { Layerr } from "layerr";
import DatasourceAuthManager from "./DatasourceAuthManager.js";
import { GoogleDriveAttachments } from "./attachments/googleDrive.js";
import { TextDatasource } from "./TextDatasource.js";
import { fireInstantiationHandlers, registerDatasource } from "./register.js";
import { Credentials } from "../credentials/Credentials.js";
import { getCredentials } from "../credentials/memory/credentials.js";
import {
    AttachmentDetails,
    BufferLike,
    DatasourceConfigurationGoogleDrive,
    DatasourceLoadedData,
    History,
    VaultID
} from "../types.js";

const DATASOURCE_TYPE = "googledrive";

/**
 * Datasource for Google Drive archives
 * @augments TextDatasource
 * @memberof module:Buttercup
 */
export default class GoogleDriveDatasource extends TextDatasource {
    attachments: GoogleDriveAttachments;
    authManager: DatasourceAuthManager;
    client: GoogleDriveClient;
    fileID: string;
    token: string;
    refreshToken: string;

    /**
     * Datasource for Google Drive connections
     * @param credentials The credentials instance with which to
     *  configure the datasource with
     */
    constructor(credentials: Credentials) {
        super(credentials);
        const { data: credentialData } = getCredentials(credentials.id);
        const { datasource: datasourceConfig } = credentialData as {
            datasource: DatasourceConfigurationGoogleDrive;
        };
        const { token, refreshToken, fileID } = datasourceConfig;
        this.fileID = fileID;
        this.token = token;
        this.refreshToken = refreshToken;
        this.client = new GoogleDriveClient(token);
        this.attachments = new GoogleDriveAttachments(this.client, token);
        this.authManager = DatasourceAuthManager.getSharedManager();
        this.type = DATASOURCE_TYPE;
        fireInstantiationHandlers(DATASOURCE_TYPE, this);
    }

    /**
     * Get encrypted attachment data
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof GoogleDriveDatasource
     */
    getAttachment(vaultID: VaultID, attachmentID: string): Promise<BufferLike> {
        return this._withAuthRetry("Failed fetching Google Drive attachment", () =>
            this.attachments.getAttachment(vaultID, attachmentID)
        );
    }

    /**
     * Get the datasource configuration
     * @memberof GoogleDriveDatasource
     */
    getConfiguration(): DatasourceConfigurationGoogleDrive {
        return {
            type: "googledrive",
            token: this.token,
            refreshToken: this.refreshToken,
            fileID: this.fileID
        };
    }

    /**
     * Load an archive from the datasource
     * @param credentials The credentials for decryption
     * @returns A promise that resolves archive history
     * @memberof GoogleDriveDatasource
     */
    load(credentials: Credentials, hasAuthed: boolean = false): Promise<DatasourceLoadedData> {
        if (this.hasContent) {
            return super.load(credentials);
        }
        return this.client
            .getFileContents(this.fileID)
            .then((content) => {
                this.setContent(content);
                return super.load(credentials);
            })
            .catch((err) => {
                const { authFailure = false } = Layerr.info(err);
                if (!authFailure) {
                    throw new Layerr(err, "Failed fetching Google Drive vault");
                } else if (hasAuthed) {
                    throw new Layerr(err, "Re-authentication failed");
                }
                return this.authManager
                    .executeAuthHandlers(DATASOURCE_TYPE, this)
                    .then(() => this.load(credentials, true))
                    .catch((err2) => {
                        throw new Layerr(err2, "Failed fetching Google Drive vault");
                    });
            });
    }

    /**
     * Put encrypted attachment data
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @param buffer The encrypted attachment data
     * @param details The attachment details
     * @memberof GoogleDriveDatasource
     */
    putAttachment(
        vaultID: VaultID,
        attachmentID: string,
        buffer: BufferLike,
        details: AttachmentDetails
    ): Promise<void> {
        return this._withAuthRetry("Failed saving Google Drive attachment", () =>
            this.attachments.putAttachment(vaultID, attachmentID, buffer)
        );
    }

    /**
     * Remove an attachment
     * @param vaultID The ID of the vault
     * @param attachmentID The ID of the attachment
     * @memberof GoogleDriveDatasource
     */
    removeAttachment(vaultID: VaultID, attachmentID: string): Promise<void> {
        return this._withAuthRetry("Failed removing Google Drive attachment", () =>
            this.attachments.removeAttachment(vaultID, attachmentID)
        );
    }

    /**
     * Save an archive using the datasource
     * @param history The archive history to save
     * @param credentials The credentials to save with
     * @returns A promise that resolves when saving has completed
     * @memberof GoogleDriveDatasource
     */
    save(history: History, credentials: Credentials, hasAuthed: boolean = false) {
        return super
            .save(history, credentials)
            .then((encryptedContent) => this.client.putFileContents(encryptedContent, this.fileID))
            .catch((err) => {
                const { authFailure = false } = Layerr.info(err);
                if (!authFailure) {
                    throw new Layerr(err, "Failed saving Google Drive vault");
                } else if (hasAuthed) {
                    throw new Layerr(err, "Re-authentication failed");
                }
                return this.authManager
                    .executeAuthHandlers(DATASOURCE_TYPE, this)
                    .then(() => this.save(history, credentials, true))
                    .catch((err2) => {
                        throw new Layerr(err2, "Failed saving Google Drive vault");
                    });
            });
    }

    /**
     * Whether or not the datasource supports attachments
     * @memberof GoogleDriveDatasource
     */
    supportsAttachments(): boolean {
        return true;
    }

    /**
     * Whether or not the datasource supports bypassing remote fetch operations
     * @returns True if content can be set to bypass fetch operations,
     *  false otherwise
     * @memberof GoogleDriveDatasource
     */
    supportsRemoteBypass() {
        return true;
    }

    /**
     * Update the OAuth2 tokens
     * @param accessToken The access token
     * @param refreshToken The refresh token, if available
     * @memberof GoogleDriveDatasource
     */
    updateTokens(accessToken: string, refreshToken?: string) {
        this.token = accessToken;
        if (refreshToken) this.refreshToken = refreshToken;
        this.client = new GoogleDriveClient(accessToken);
        this.attachments.updateClient(this.client, accessToken);
        const { data: credentialData } = getCredentials(this.credentials.id);
        credentialData.datasource.token = accessToken;
        if (refreshToken) credentialData.datasource.refreshToken = refreshToken;
        this.emit("updated");
    }

    /**
     * Run an operation, re-authenticating (via the auth manager's handlers)
     * and retrying once if it fails authentication
     */
    async _withAuthRetry<T>(failureMessage: string, operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (err) {
            const { authFailure = false } = Layerr.info(err);
            if (!authFailure) {
                throw new Layerr(err, failureMessage);
            }
        }
        try {
            await this.authManager.executeAuthHandlers(DATASOURCE_TYPE, this);
            return await operation();
        } catch (err) {
            throw new Layerr(err, failureMessage);
        }
    }
}

registerDatasource(DATASOURCE_TYPE, GoogleDriveDatasource);
