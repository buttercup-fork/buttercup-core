import { expect } from "chai";
import {
    Credentials,
    DatasourceAuthManager,
    OneDriveDatasource,
    Vault,
    VaultManager,
    VaultSource
} from "../../../dist/node/index.js";
import { getCredentials } from "../../../dist/node/credentials/memory/credentials.js";
import { createOneDriveServer } from "../../resources/oneDriveServer.js";

const PASSWORD = "test";

function createVault() {
    const vault = Vault.createWithDefaults();
    vault.findGroupsByTitle("General")[0].createEntry("Test").setProperty("username", "user");
    return vault;
}

function readTitles(history, Format) {
    return Vault.createFromHistory(history, Format)
        .getAllEntries()
        .map((entry) => entry.getProperty("title"));
}

describe("OneDriveDatasource", function () {
    beforeEach(async function () {
        this.server = createOneDriveServer();
        await this.server.start();
        this.createDatasource = (config = {}) =>
            new OneDriveDatasource(
                Credentials.fromDatasource(
                    {
                        type: "onedrive",
                        token: "valid-token",
                        endpoint: this.server.endpoint,
                        ...config
                    },
                    PASSWORD
                )
            );
    });

    afterEach(async function () {
        delete DatasourceAuthManager.getSharedManager()._handlers.onedrive;
        await this.server.stop();
    });

    it("requires a file ID or path", function () {
        expect(() => this.createDatasource()).to.throw(/fileID or path/);
    });

    it("supports saving to and loading from a path", async function () {
        const datasource = this.createDatasource({ path: "/Vaults/My Vault.bcup" });
        await datasource.save(createVault().format.history, Credentials.fromPassword(PASSWORD));
        expect(this.server.files.has("path:Vaults/My Vault.bcup")).to.be.true;
        // A new instance, so content isn't served from the datasource's cache
        const { Format, history } = await this.createDatasource({
            path: "/Vaults/My Vault.bcup"
        }).load(Credentials.fromPassword(PASSWORD));
        expect(readTitles(history, Format)).to.deep.equal(["Test"]);
    });

    it("supports loading and saving by file ID, following the download redirect", async function () {
        const pathDatasource = this.createDatasource({ path: "seed.bcup" });
        const encrypted = await pathDatasource.save(
            createVault().format.history,
            Credentials.fromPassword(PASSWORD)
        );
        this.server.files.set("id:ABC!123", encrypted);
        const datasource = this.createDatasource({ fileID: "ABC!123" });
        const { Format, history } = await datasource.load(Credentials.fromPassword(PASSWORD));
        expect(readTitles(history, Format)).to.deep.equal(["Test"]);
        expect(this.server.requests.some((req) => req.path.startsWith("/download/"))).to.be.true;
        // Save back by ID
        const vault = Vault.createFromHistory(history, Format);
        vault.findGroupsByTitle("General")[0].createEntry("Second");
        await datasource.save(vault.format.history, Credentials.fromPassword(PASSWORD));
        expect(this.server.files.get("id:ABC!123")).to.not.equal(encrypted);
    });

    it("sends the bearer token and a text content type", async function () {
        const datasource = this.createDatasource({ path: "test.bcup" });
        await datasource.save(createVault().format.history, Credentials.fromPassword(PASSWORD));
        const put = this.server.requests.find((req) => req.method === "PUT");
        expect(put.authorization).to.equal("Bearer valid-token");
        expect(put.contentType).to.match(/^text\/plain/);
    });

    it("fails with the HTTP status for a missing file", async function () {
        const datasource = this.createDatasource({ path: "missing.bcup" });
        let error = null;
        try {
            await datasource.load(Credentials.fromPassword(PASSWORD));
        } catch (err) {
            error = err;
        }
        expect(error).to.be.an("error");
        expect(error.message).to.match(/Failed fetching OneDrive vault/);
        expect(error.message).to.match(/404/);
    });

    describe("with an expired token", function () {
        it("runs auth handlers, then retries with the new token", async function () {
            const seed = this.createDatasource({ path: "test.bcup" });
            await seed.save(createVault().format.history, Credentials.fromPassword(PASSWORD));
            let handlerCalls = 0;
            DatasourceAuthManager.getSharedManager().registerHandler("onedrive", (datasource) => {
                handlerCalls += 1;
                datasource.updateTokens("valid-token", "new-refresh");
            });
            const datasource = this.createDatasource({
                path: "test.bcup",
                token: "expired-token",
                refreshToken: "old-refresh"
            });
            const { Format, history } = await datasource.load(Credentials.fromPassword(PASSWORD));
            expect(handlerCalls).to.equal(1);
            expect(readTitles(history, Format)).to.deep.equal(["Test"]);
            const raw = getCredentials(datasource.credentials.id);
            expect(raw.data.datasource.token).to.equal("valid-token");
            expect(raw.data.datasource.refreshToken).to.equal("new-refresh");
        });

        it("fails if the token is still rejected after re-authenticating", async function () {
            DatasourceAuthManager.getSharedManager().registerHandler("onedrive", (datasource) => {
                datasource.updateTokens("still-invalid");
            });
            const datasource = this.createDatasource({ path: "test.bcup", token: "expired-token" });
            let error = null;
            try {
                await datasource.save(
                    createVault().format.history,
                    Credentials.fromPassword(PASSWORD)
                );
            } catch (err) {
                error = err;
            }
            expect(error).to.be.an("error");
            expect(error.message).to.match(/Re-authentication failed/);
        });
    });

    it("works through a VaultSource", async function () {
        const manager = new VaultManager({ autoUpdate: false });
        const createSource = async () => {
            const credentials = Credentials.fromDatasource(
                {
                    type: "onedrive",
                    token: "valid-token",
                    path: "Apps/Buttercup/vault.bcup",
                    endpoint: this.server.endpoint
                },
                PASSWORD
            );
            const source = new VaultSource(
                "OneDrive",
                "onedrive",
                await credentials.toSecureString()
            );
            await manager.addSource(source);
            return source;
        };
        const source = await createSource();
        await source.unlock(Credentials.fromPassword(PASSWORD), { initialiseRemote: true });
        source.vault.findGroupsByTitle("General")[0].createEntry("Via source");
        await source.save();
        await source.lock();
        const reopened = await createSource();
        await reopened.unlock(Credentials.fromPassword(PASSWORD));
        const titles = reopened.vault.getAllEntries().map((entry) => entry.getProperty("title"));
        expect(titles).to.deep.equal(["Via source"]);
        await reopened.lock();
    });
});
