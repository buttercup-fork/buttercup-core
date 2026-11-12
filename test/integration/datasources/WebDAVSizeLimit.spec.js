import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { expect } from "chai";
import { dirSync } from "tmp";
import {
    Credentials,
    ErrorCode,
    getErrorCode,
    Vault,
    WebDAVDatasource
} from "../../../dist/node/index.js";
import { PASSWORD, PATH, PORT, USERNAME, createServer } from "../../resources/webdavServer.js";
import { assertDataSize, readResponseWithLimit } from "../../../dist/node/tools/size.js";

// Attachment paths take UUIDs only (B-685)
const VAULT_ID = "6f1c2a40-8f0e-4d5b-9a51-2f6d3c1e7b90";
const ATTACHMENT_ID = "0b7e9d2c-3a14-4f6b-8c2d-9e1f5a7b3c40";

async function captureError(callback) {
    try {
        await callback();
    } catch (err) {
        return err;
    }
    return null;
}

function expectTooLarge(error) {
    expect(error).to.be.an("error");
    expect(error.message).to.match(/larger than the limit/);
    expect(getErrorCode(error)).to.equal(ErrorCode.DataTooLarge);
}

function createDatasource(endpoint, filePath = "/test.bcup") {
    return new WebDAVDatasource(
        Credentials.fromDatasource(
            { endpoint, password: PASSWORD, path: filePath, username: USERNAME },
            "test"
        )
    );
}

function attachmentFile(dir) {
    return path.join(dir, ".buttercup", VAULT_ID, `${ATTACHMENT_ID}.bcatt`);
}

describe("WebDAVDatasource size limit (B-629)", function () {
    describe("with a WebDAV server", function () {
        beforeEach(async function () {
            this.dir = dirSync().name;
            this.server = createServer(this.dir, "basic");
            await this.server.start();
            this.datasource = createDatasource(`http://localhost:${PORT}${PATH}`);
            this.vault = Vault.createWithDefaults();
            this.vault.findGroupsByTitle("General")[0].createEntry("Test");
        });

        afterEach(async function () {
            await this.server.stop();
        });

        it("defaults to 200 MB", function () {
            expect(this.datasource._maxDataSize).to.equal(200 * 1024 * 1024);
        });

        it("still saves and loads a vault under the limit", async function () {
            this.datasource._maxDataSize = 1024 * 1024;
            await this.datasource.save(this.vault.format.history, Credentials.fromPassword("test"));
            const reader = createDatasource(`http://localhost:${PORT}${PATH}`);
            reader._maxDataSize = 1024 * 1024;
            const { Format, history } = await reader.load(Credentials.fromPassword("test"));
            const loaded = Vault.createFromHistory(history, Format);
            expect(loaded.findEntriesByProperty("title", "Test")).to.have.lengthOf(1);
        });

        it("refuses to save a vault over the limit, without sending it", async function () {
            this.datasource._maxDataSize = 10;
            const error = await captureError(() =>
                this.datasource.save(this.vault.format.history, Credentials.fromPassword("test"))
            );
            expectTooLarge(error);
            expect(fs.existsSync(path.join(this.dir, "test.bcup"))).to.equal(false);
        });

        it("refuses to upload an attachment over the limit, without sending it", async function () {
            this.datasource._maxDataSize = 1000;
            const error = await captureError(() =>
                this.datasource.putAttachment(VAULT_ID, ATTACHMENT_ID, Buffer.alloc(5000), {})
            );
            expectTooLarge(error);
            expect(fs.existsSync(attachmentFile(this.dir))).to.equal(false);
        });
    });

    // A plain HTTP server, so the test can close the client's open connections:
    // webdav-server's stop waits for them, and after a GET of a file written
    // to its folder directly it hung with the old read path too
    describe("with a server that declares a Content-Length", function () {
        beforeEach(async function () {
            this.gets = 0;
            this.body = Buffer.alloc(5000, 120);
            this.server = http.createServer((req, res) => {
                if (req.method === "PROPFIND") {
                    res.writeHead(404).end();
                } else if (req.method === "MKCOL") {
                    res.writeHead(201).end();
                } else if (req.method === "GET") {
                    this.gets += 1;
                    res.writeHead(200, { "Content-Length": String(this.body.length) });
                    res.end(this.body);
                } else {
                    res.writeHead(405).end();
                }
            });
            await new Promise((resolve) => this.server.listen(0, "127.0.0.1", resolve));
            const { port } = this.server.address();
            this.datasource = createDatasource(`http://127.0.0.1:${port}/dav`);
            this.datasource._maxDataSize = 1000;
        });

        afterEach(async function () {
            this.server.closeAllConnections();
            await new Promise((resolve) => this.server.close(resolve));
        });

        it("refuses to load the vault", async function () {
            const error = await captureError(() =>
                this.datasource.load(Credentials.fromPassword("test"))
            );
            expectTooLarge(error);
            expect(this.gets).to.equal(1);
        });

        it("refuses to read the attachment", async function () {
            const error = await captureError(() =>
                this.datasource.getAttachment(VAULT_ID, ATTACHMENT_ID)
            );
            expectTooLarge(error);
            expect(this.gets).to.equal(1);
        });

        it("reads an attachment under the limit as binary data", async function () {
            this.body = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
            const data = await this.datasource.getAttachment(VAULT_ID, ATTACHMENT_ID);
            expect(Buffer.isBuffer(data)).to.equal(true);
            expect(Buffer.compare(data, this.body)).to.equal(0);
        });
    });

    describe("with a server that sends no Content-Length", function () {
        beforeEach(async function () {
            this.sent = 0;
            this.closed = false;
            // Streams data forever (chunked) until the client goes away
            this.server = http.createServer((req, res) => {
                res.writeHead(200, { "Content-Type": "application/octet-stream" });
                const chunk = Buffer.alloc(16 * 1024, 120);
                const timer = setInterval(() => {
                    this.sent += chunk.length;
                    res.write(chunk);
                }, 1);
                res.on("close", () => {
                    clearInterval(timer);
                    this.closed = true;
                });
            });
            await new Promise((resolve) => this.server.listen(0, "127.0.0.1", resolve));
            const { port } = this.server.address();
            this.datasource = createDatasource(`http://127.0.0.1:${port}/dav`);
        });

        afterEach(async function () {
            this.server.closeAllConnections();
            await new Promise((resolve) => this.server.close(resolve));
        });

        it("stops reading once the limit is passed and closes the connection", async function () {
            this.datasource._maxDataSize = 64 * 1024;
            const error = await captureError(() =>
                this.datasource.load(Credentials.fromPassword("test"))
            );
            expectTooLarge(error);
            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(this.closed, "server saw the connection close").to.equal(true);
            // The server keeps writing until it sees the close: bounded, not the whole stream
            expect(this.sent).to.be.below(5 * 1024 * 1024);
        });
    });

    describe("tools", function () {
        it("counts UTF-8 bytes, not characters, for a string", function () {
            // 400 characters, 800 bytes
            expect(() => assertDataSize("é".repeat(400), 799, "test")).to.throw(/larger than/);
            expect(() => assertDataSize("é".repeat(400), 800, "test")).to.not.throw();
        });

        it("checks binary data by its byte length", function () {
            expect(() => assertDataSize(new ArrayBuffer(11), 10, "test")).to.throw(/larger/);
            expect(() => assertDataSize(Buffer.alloc(10), 10, "test")).to.not.throw();
        });

        it("refuses a declared Content-Length over the limit before reading", async function () {
            let aborted = false;
            let read = false;
            const response = {
                headers: { get: (name) => (name === "content-length" ? "2000" : null) },
                body: null,
                arrayBuffer: async () => {
                    read = true;
                    return new ArrayBuffer(2000);
                }
            };
            const error = await captureError(() =>
                readResponseWithLimit(response, 1000, () => (aborted = true), "test")
            );
            expectTooLarge(error);
            expect(aborted).to.equal(true);
            expect(read).to.equal(false);
        });

        it("checks the size after reading when the body is not a stream (React Native)", async function () {
            const response = {
                headers: { get: () => null },
                body: undefined,
                arrayBuffer: async () => new ArrayBuffer(2000)
            };
            const error = await captureError(() =>
                readResponseWithLimit(response, 1000, () => {}, "test")
            );
            expectTooLarge(error);
            const small = { ...response, arrayBuffer: async () => new ArrayBuffer(10) };
            const data = await readResponseWithLimit(small, 1000, () => {}, "test");
            expect(data.byteLength).to.equal(10);
        });
    });
});
