import { Layerr } from "layerr";
import DatasourceAuthManager from "./DatasourceAuthManager.js";
import type { OneDriveClient } from "@buttercup/onedrive-client";
import { TextDatasource } from "./TextDatasource.js";
import { fireInstantiationHandlers, registerDatasource } from "./register.js";
import { Credentials } from "../credentials/Credentials.js";
import { getCredentials } from "../credentials/memory/credentials.js";
import { getSharedAppEnv } from "../env/appEnv.js";
import {
    DatasourceConfigurationOneDrive,
    DatasourceLoadedData,
    EncryptedContent,
    History
} from "../types.js";

const DATASOURCE_TYPE = "onedrive";

/**
 * Datasource for Microsoft OneDrive vaults, via the Microsoft Graph API.
 * Authentication (OAuth2) is performed by the application - this datasource
 * only consumes the access token. When a request fails authentication, the
 * auth handlers registered on the shared `DatasourceAuthManager` for the
 * "onedrive" type are executed, which should call `updateTokens`, and the
 * request is retried once.
 * @augments TextDatasource
 * @memberof module:Buttercup
 */
export default class OneDriveDatasource extends TextDatasource {
    authManager: DatasourceAuthManager;
    client: OneDriveClient;
    endpoint?: string;
    fileID?: string;
    path?: string;
    refreshToken?: string;
    token: string;

    /**
     * Datasource for OneDrive connections
     * @param credentials The credentials instance with which to
     *  configure the datasource with
     */
    constructor(credentials: Credentials) {
        super(credentials);
        const { data: credentialData } = getCredentials(credentials.id);
        const { datasource: datasourceConfig } = credentialData as {
            datasource: DatasourceConfigurationOneDrive;
        };
        const { endpoint, fileID, path, refreshToken, token } = datasourceConfig;
        if (!fileID && !path) {
            throw new Layerr(
                "Failed creating OneDrive datasource: Either fileID or path is required"
            );
        }
        this.endpoint = endpoint;
        this.fileID = fileID;
        this.path = path;
        this.refreshToken = refreshToken;
        this.token = token;
        this.client = this._createClient(token);
        this.authManager = DatasourceAuthManager.getSharedManager();
        this.type = DATASOURCE_TYPE;
        fireInstantiationHandlers(DATASOURCE_TYPE, this);
    }

    /**
     * Get the datasource configuration
     * @memberof OneDriveDatasource
     */
    getConfiguration(): DatasourceConfigurationOneDrive {
        const config: DatasourceConfigurationOneDrive = {
            type: DATASOURCE_TYPE,
            token: this.token
        };
        if (this.refreshToken) config.refreshToken = this.refreshToken;
        if (this.fileID) config.fileID = this.fileID;
        if (this.path) config.path = this.path;
        if (this.endpoint) config.endpoint = this.endpoint;
        return config;
    }

    /**
     * Load a vault from OneDrive
     * @param credentials The credentials for decryption
     * @returns A promise that resolves with vault history
     * @memberof OneDriveDatasource
     */
    load(credentials: Credentials, hasAuthed: boolean = false): Promise<DatasourceLoadedData> {
        if (this.hasContent) {
            return super.load(credentials);
        }
        return this.client
            .getFileContents(this._target)
            .then((content) => {
                this.setContent(content);
                return super.load(credentials);
            })
            .catch((err) =>
                this._handleAuthFailure(err, hasAuthed, "Failed fetching OneDrive vault", () =>
                    this.load(credentials, true)
                )
            );
    }

    /**
     * Save a vault to OneDrive
     * @param history The vault history to save
     * @param credentials The credentials to save with
     * @returns A promise that resolves with the encrypted content
     * @memberof OneDriveDatasource
     */
    save(
        history: History,
        credentials: Credentials,
        hasAuthed: boolean = false
    ): Promise<EncryptedContent> {
        return super
            .save(history, credentials)
            .then(async (encryptedContent: EncryptedContent) => {
                await this.client.putFileContents(this._target, encryptedContent);
                return encryptedContent;
            })
            .catch((err) =>
                this._handleAuthFailure(err, hasAuthed, "Failed saving OneDrive vault", () =>
                    this.save(history, credentials, true)
                )
            );
    }

    /**
     * Whether or not the datasource supports bypassing remote fetch operations
     * @returns True if content can be set to bypass fetch operations,
     *  false otherwise
     * @memberof OneDriveDatasource
     */
    supportsRemoteBypass(): boolean {
        return true;
    }

    /**
     * Update the OAuth2 tokens
     * @param accessToken The access token
     * @param refreshToken The refresh token, if available
     * @memberof OneDriveDatasource
     */
    updateTokens(accessToken: string, refreshToken?: string) {
        this.token = accessToken;
        if (refreshToken) this.refreshToken = refreshToken;
        this.client = this._createClient(accessToken);
        const { data: credentialData } = getCredentials(this.credentials.id);
        credentialData.datasource.token = accessToken;
        if (refreshToken) credentialData.datasource.refreshToken = refreshToken;
        this.emit("updated");
    }

    _createClient(token: string): OneDriveClient {
        const createClient = getSharedAppEnv().getProperty("net/onedrive/v1/newClient");
        return createClient(token, this.endpoint);
    }

    get _target() {
        return { fileID: this.fileID, path: this.path };
    }

    _handleAuthFailure<T>(
        err: Error,
        hasAuthed: boolean,
        failureMessage: string,
        retry: () => Promise<T>
    ): Promise<T> {
        const { authFailure = false } = Layerr.info(err);
        if (!authFailure) {
            throw new Layerr(err, failureMessage);
        } else if (hasAuthed) {
            throw new Layerr(err, "Re-authentication failed");
        }
        return this.authManager
            .executeAuthHandlers(DATASOURCE_TYPE, this)
            .then(retry)
            .catch((err2) => {
                throw new Layerr(err2, failureMessage);
            });
    }
}

registerDatasource(DATASOURCE_TYPE, OneDriveDatasource);
