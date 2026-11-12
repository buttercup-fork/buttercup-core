import fs from "node:fs";
import path from "node:path";
import { expect } from "chai";
import sinon from "sinon";
import { dirSync } from "tmp";
import {
    Credentials,
    ErrorCode,
    FileDatasource,
    WebDAVDatasource,
    getErrorCode
} from "../../../dist/node/index.js";
import { PASSWORD, PATH, PORT, USERNAME, createServer } from "../../resources/webdavServer.js";

// B-685 (self-audit run-1 C-3): vault and attachment IDs become part of the
// attachment path, and the vault ID comes from vault content
const VAULT_ID = "6f1c2a40-8f0e-4d5b-9a51-2f6d3c1e7b90";
const ATTACHMENT_ID = "0b7e9d2c-3a14-4f6b-8c2d-9e1f5a7b3c40";
const DATA = Buffer.from("attachment data");

const BAD_IDS = [
    // [vault ID, attachment ID]
    ["../../escaped", ATTACHMENT_ID],
    ["..", ATTACHMENT_ID],
    [`${VAULT_ID}/../..`, ATTACHMENT_ID],
    ["", ATTACHMENT_ID],
    [VAULT_ID, "../../../escaped"],
    [VAULT_ID, `..\\..\\..\\escaped`],
    [VAULT_ID, `${ATTACHMENT_ID}/x`],
    [VAULT_ID, ""],
    [VAULT_ID, undefined]
];

async function expectInvalidID(call) {
    let error = null;
    try {
        await call();
    } catch (err) {
        error = err;
    }
    expect(error).to.be.an("error");
    expect(getErrorCode(error)).to.equal(ErrorCode.InvalidStorageID);
}

function attachmentCalls(datasource, vaultID, attachmentID) {
    return [
        () => datasource.putAttachment(vaultID, attachmentID, DATA, {}),
        () => datasource.getAttachment(vaultID, attachmentID),
        () => datasource.removeAttachment(vaultID, attachmentID)
    ];
}

describe("attachment storage paths (B-685)", function () {
    describe("FileDatasource", function () {
        beforeEach(function () {
            // <root>/vaults/mine/vault.bcup: "../../escaped" would land in <root>/vaults
            this.root = dirSync({ unsafeCleanup: true }).name;
            this.vaultDir = path.join(this.root, "vaults", "mine");
            fs.mkdirSync(this.vaultDir, { recursive: true });
            this.datasource = new FileDatasource(
                Credentials.fromDatasource({ path: path.join(this.vaultDir, "vault.bcup") })
            );
        });

        it("refuses IDs that are not UUIDs and touches nothing", async function () {
            for (const [vaultID, attachmentID] of BAD_IDS) {
                for (const call of attachmentCalls(this.datasource, vaultID, attachmentID)) {
                    await expectInvalidID(call);
                }
            }
            expect(fs.readdirSync(this.root)).to.deep.equal(["vaults"]);
            expect(fs.readdirSync(path.join(this.root, "vaults"))).to.deep.equal(["mine"]);
            expect(fs.readdirSync(this.vaultDir)).to.deep.equal([]);
        });

        it("keeps a removal inside the vault folder: another vault's attachment stays", async function () {
            const otherVaultID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
            await this.datasource.putAttachment(otherVaultID, ATTACHMENT_ID, DATA, {});
            await expectInvalidID(() =>
                this.datasource.removeAttachment(VAULT_ID, `../${otherVaultID}/${ATTACHMENT_ID}`)
            );
            const kept = await this.datasource.getAttachment(otherVaultID, ATTACHMENT_ID);
            expect(kept.equals(DATA)).to.be.true;
        });

        it("still stores UUID IDs, in either case", async function () {
            const upper = VAULT_ID.toUpperCase();
            await this.datasource.putAttachment(upper, ATTACHMENT_ID, DATA, {});
            const file = path.join(this.vaultDir, ".buttercup", upper, `${ATTACHMENT_ID}.bcatt`);
            expect(fs.readFileSync(file).equals(DATA)).to.be.true;
            const data = await this.datasource.getAttachment(upper, ATTACHMENT_ID);
            expect(data.equals(DATA)).to.be.true;
            await this.datasource.removeAttachment(upper, ATTACHMENT_ID);
            expect(fs.existsSync(file)).to.be.false;
        });
    });

    describe("WebDAVDatasource", function () {
        beforeEach(async function () {
            this.dir = dirSync({ unsafeCleanup: true }).name;
            this.server = createServer(this.dir, "basic");
            await this.server.start();
            this.datasource = new WebDAVDatasource(
                Credentials.fromDatasource(
                    {
                        endpoint: `http://localhost:${PORT}${PATH}`,
                        password: PASSWORD,
                        path: "/vaults/mine/vault.bcup",
                        username: USERNAME
                    },
                    "test"
                )
            );
            const { client } = this.datasource;
            this.clientSpies = [
                "createDirectory",
                "customRequest",
                "deleteFile",
                "getFileContents",
                "putFileContents"
            ].map((method) => sinon.spy(client, method));
        });

        afterEach(async function () {
            this.clientSpies.forEach((spy) => spy.restore());
            await this.server.stop();
        });

        it("refuses IDs that are not UUIDs before any request", async function () {
            for (const [vaultID, attachmentID] of BAD_IDS) {
                for (const call of attachmentCalls(this.datasource, vaultID, attachmentID)) {
                    await expectInvalidID(call);
                }
            }
            this.clientSpies.forEach((spy) => expect(spy.notCalled).to.be.true);
            expect(fs.readdirSync(this.dir)).to.deep.equal([]);
        });

        it("still stores UUID IDs", async function () {
            await this.datasource.putAttachment(VAULT_ID, ATTACHMENT_ID, DATA, {});
            const file = path.join(
                this.dir,
                "vaults",
                "mine",
                ".buttercup",
                VAULT_ID,
                `${ATTACHMENT_ID}.bcatt`
            );
            expect(fs.readFileSync(file).equals(DATA)).to.be.true;
            const data = await this.datasource.getAttachment(VAULT_ID, ATTACHMENT_ID);
            expect(Buffer.from(data).equals(DATA)).to.be.true;
            await this.datasource.removeAttachment(VAULT_ID, ATTACHMENT_ID);
            expect(fs.existsSync(file)).to.be.false;
        });
    });
});
