import { expect } from "chai";
import {
    Credentials,
    DatasourceAuthManager,
    DropboxDatasource,
    GoogleDriveDatasource
} from "../../../dist/node/index.js";
import { createFakeDropbox, createFakeGoogleDrive } from "../../resources/fakeCloudStorage.js";

// Every byte value, so encoding mistakes (eg. treating data as text) show up
const BINARY = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

describe("cloud datasource attachments", function () {
    describe("DropboxDatasource", function () {
        beforeEach(function () {
            this.fake = createFakeDropbox();
            this.datasource = new DropboxDatasource(
                Credentials.fromDatasource(
                    { type: "dropbox", token: "tkn", path: "/Vaults/Mein Tresor/vault.bcup" },
                    "test"
                )
            );
            this.datasource.client.patcher.patch("request", this.fake.request);
        });

        it("stores attachments next to the vault, like file/WebDAV vaults", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            expect([...this.fake.files.keys()]).to.deep.equal([
                "/vaults/mein tresor/.buttercup/vault-id/att-id.bcatt"
            ]);
        });

        it("round-trips binary data as a Buffer", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            const data = await this.datasource.getAttachment("vault-id", "att-id");
            expect(Buffer.isBuffer(data)).to.be.true;
            expect(data.equals(BINARY)).to.be.true;
        });

        it("downloads with an ASCII-safe API arg header", async function () {
            const datasource = new DropboxDatasource(
                Credentials.fromDatasource(
                    { type: "dropbox", token: "tkn", path: "/Tresör/v.bcup" },
                    "t"
                )
            );
            datasource.client.patcher.patch("request", this.fake.request);
            await datasource.putAttachment("v", "a", BINARY, {});
            await datasource.getAttachment("v", "a");
            const download = this.fake.requests.find((req) => /download$/.test(req.url));
            expect(download.headers["Dropbox-API-Arg"]).to.match(/^[\x20-\x7e]+$/);
            expect(download.headers.Authorization).to.equal("Bearer tkn");
        });

        it("passes the token in the query in compat (browser) mode", async function () {
            this.datasource.client._config = { compat: true };
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            await this.datasource.getAttachment("vault-id", "att-id");
            const download = this.fake.requests.find((req) => /download$/.test(req.url));
            expect(download.query).to.include({
                authorization: "Bearer tkn",
                reject_cors_preflight: "true"
            });
            expect(download.headers).to.not.have.property("Authorization");
        });

        it("removes attachments", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            await this.datasource.removeAttachment("vault-id", "att-id");
            expect(this.fake.files.size).to.equal(0);
        });
    });

    describe("GoogleDriveDatasource", function () {
        beforeEach(function () {
            this.fake = createFakeGoogleDrive();
            this.datasource = new GoogleDriveDatasource(
                Credentials.fromDatasource(
                    { type: "googledrive", token: "tkn", refreshToken: "rt", fileID: "vault" },
                    "test"
                )
            );
            this.datasource.client.patcher.patch("request", this.fake.request);
        });

        afterEach(function () {
            delete DatasourceAuthManager.getSharedManager()._handlers.googledrive;
        });

        const itemsNamed = (fake, name) =>
            [...fake.items.values()].filter((item) => item.name === name);

        it("stores attachments in /.buttercup/<vault ID>/", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            const [root] = itemsNamed(this.fake, ".buttercup");
            const [vaultFolder] = itemsNamed(this.fake, "vault-id");
            const [file] = itemsNamed(this.fake, "att-id.bcatt");
            expect(root.parents).to.deep.equal(["root"]);
            expect(vaultFolder.parents).to.deep.equal([root.id]);
            expect(file.parents).to.deep.equal([vaultFolder.id]);
            expect(Buffer.from(file.data).equals(BINARY)).to.be.true;
        });

        it("round-trips binary data as a Buffer", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            const data = await this.datasource.getAttachment("vault-id", "att-id");
            expect(Buffer.isBuffer(data)).to.be.true;
            expect(data.equals(BINARY)).to.be.true;
        });

        it("updates an existing attachment in place", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", Buffer.from("first"), {});
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            const files = itemsNamed(this.fake, "att-id.bcatt");
            expect(files).to.have.lengthOf(1);
            expect(Buffer.from(files[0].data).equals(BINARY)).to.be.true;
        });

        it("reuses folders, including from other datasource instances", async function () {
            await Promise.all([
                this.datasource.putAttachment("vault-id", "a1", BINARY, {}),
                this.datasource.putAttachment("vault-id", "a2", BINARY, {})
            ]);
            const other = new GoogleDriveDatasource(
                Credentials.fromDatasource(
                    { type: "googledrive", token: "tkn", refreshToken: "rt", fileID: "vault" },
                    "test"
                )
            );
            other.client.patcher.patch("request", this.fake.request);
            await other.putAttachment("vault-id", "a3", BINARY, {});
            expect(itemsNamed(this.fake, ".buttercup")).to.have.lengthOf(1);
            expect(itemsNamed(this.fake, "vault-id")).to.have.lengthOf(1);
            const data = await other.getAttachment("vault-id", "a1");
            expect(data.equals(BINARY)).to.be.true;
        });

        it("removes attachments", async function () {
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            await this.datasource.removeAttachment("vault-id", "att-id");
            expect(itemsNamed(this.fake, "att-id.bcatt")).to.have.lengthOf(0);
        });

        it("fails clearly for a missing attachment without creating folders", async function () {
            let error = null;
            try {
                await this.datasource.getAttachment("vault-id", "missing");
            } catch (err) {
                error = err;
            }
            expect(error).to.be.an("error");
            expect(error.message).to.match(/Attachment not found/);
            expect(this.fake.items.size).to.equal(0);
        });

        it("re-authenticates and retries once on an auth failure", async function () {
            let expired = true;
            const fakeRequest = this.fake.request;
            const request = (config) => {
                if (expired && config.headers.Authorization === "Bearer tkn") {
                    return Promise.resolve({ ok: false, status: 401, statusText: "Unauthorized" });
                }
                return fakeRequest(config);
            };
            this.datasource.client.patcher.patch("request", request);
            let handlerCalls = 0;
            DatasourceAuthManager.getSharedManager().registerHandler(
                "googledrive",
                (datasource) => {
                    handlerCalls += 1;
                    datasource.updateTokens("new-tkn");
                    datasource.client.patcher.patch("request", request);
                }
            );
            await this.datasource.putAttachment("vault-id", "att-id", BINARY, {});
            expect(handlerCalls).to.equal(1);
            const data = await this.datasource.getAttachment("vault-id", "att-id");
            expect(data.equals(BINARY)).to.be.true;
        });
    });
});
