import { expect } from "chai";
import { dirSync } from "tmp";
import {
    Credentials,
    ErrorCode,
    Vault,
    VaultManager,
    VaultSource,
    WebDAVDatasource,
    getErrorCode
} from "../../../dist/node/index.js";
import { PASSWORD, PATH, PORT, USERNAME, createServer } from "../../resources/webdavServer.js";
import { getCredentials } from "../../../dist/node/credentials/memory/credentials.js";

function storedDatasource(source) {
    return getCredentials(source._credentials.id).data.datasource;
}

// B-684: plain http to another host sends the WebDAV password in clear text

function createDatasource(endpoint, extra = {}) {
    return new WebDAVDatasource(
        Credentials.fromDatasource(
            { endpoint, password: PASSWORD, path: "/test.bcup", username: USERNAME, ...extra },
            "test"
        )
    );
}

function expectInsecure(callback) {
    let error = null;
    try {
        callback();
    } catch (err) {
        error = err;
    }
    expect(error, "expected the endpoint to be refused").to.be.an("error");
    expect(getErrorCode(error)).to.equal(ErrorCode.InsecureEndpoint);
}

async function addWebDAVSource(manager, endpoint, password = "vault-pass") {
    const credentials = Credentials.fromDatasource(
        {
            type: "webdav",
            endpoint,
            path: "/vault.bcup",
            username: USERNAME,
            password: PASSWORD
        },
        password
    );
    const source = new VaultSource("WebDAV", "webdav", await credentials.toSecureString());
    await manager.addSource(source);
    return source;
}

describe("WebDAVDatasource over http (B-684)", function () {
    describe("refuses", function () {
        [
            "http://example.com/dav",
            "http://192.168.1.10/remote.php/dav",
            "http://nas.local:5005/dav",
            "HTTP://EXAMPLE.COM/dav",
            "http://localhost.example.com/dav",
            "http://127.0.0.1.example.com/dav"
        ].forEach((endpoint) => {
            it(endpoint, function () {
                expectInsecure(() => createDatasource(endpoint));
            });
        });
    });

    describe("allows", function () {
        [
            "https://example.com/dav",
            "http://localhost:9989/dav",
            "http://LOCALHOST/dav",
            "http://127.0.0.1:8080/dav",
            "http://127.1.2.3/dav",
            "http://[::1]:8080/dav"
        ].forEach((endpoint) => {
            it(endpoint, function () {
                expect(() => createDatasource(endpoint)).to.not.throw();
            });
        });

        it("an http endpoint on another host with allowInsecure", function () {
            expect(() =>
                createDatasource("http://example.com/dav", { allowInsecure: true })
            ).to.not.throw();
        });
    });

    describe("when the platform's URL does not work (B-754)", function () {
        // React Native 0.72 has no working URL without a polyfill: the check
        // must then read the text, and refuse what it can't place
        const brokenURLs = {
            "throws when constructed": class {
                constructor() {
                    throw new Error("URL is not implemented");
                }
            },
            "throws from its getters": class {
                get protocol() {
                    throw new Error("URL.protocol is not implemented");
                }
                get hostname() {
                    throw new Error("URL.hostname is not implemented");
                }
            },
            "has no properties": class {}
        };

        Object.entries(brokenURLs).forEach(([description, BrokenURL]) => {
            describe(`a URL that ${description}`, function () {
                beforeEach(function () {
                    this.originalURL = globalThis.URL;
                    globalThis.URL = BrokenURL;
                });

                afterEach(function () {
                    globalThis.URL = this.originalURL;
                });

                [
                    "http://example.com/dav",
                    "http://192.168.1.10/remote.php/dav",
                    "HTTP://EXAMPLE.COM/dav",
                    "http://localhost.example.com/dav",
                    "http://127.0.0.1.example.com/dav",
                    "http://localhost@evil.example/dav",
                    "http://localhost\\@evil.example/dav",
                    "http://[::ffff:127.0.0.1]/dav",
                    "not a url"
                ].forEach((endpoint) => {
                    it(`refuses ${endpoint}`, function () {
                        expectInsecure(() => createDatasource(endpoint));
                    });
                });

                [
                    "https://example.com/dav",
                    "HTTPS://EXAMPLE.COM/dav",
                    "http://localhost:9989/dav",
                    "http://LOCALHOST/dav",
                    "http://127.0.0.1:8080/dav",
                    "http://[::1]:8080/dav",
                    "http://user@localhost:8080/dav",
                    "http://localhost"
                ].forEach((endpoint) => {
                    it(`allows ${endpoint}`, function () {
                        expect(() => createDatasource(endpoint)).to.not.throw();
                    });
                });

                it("allows an http endpoint on another host with allowInsecure", function () {
                    expect(() =>
                        createDatasource("http://example.com/dav", { allowInsecure: true })
                    ).to.not.throw();
                });
            });
        });
    });

    describe("unlocking a source", function () {
        // An IPv4-mapped address reaches the local test server but is not on
        // the list of names treated as this computer, so it counts as insecure
        const endpoint = `http://[::ffff:127.0.0.1]:${PORT}${PATH}`;

        beforeEach(async function () {
            this.server = createServer(dirSync().name, "basic");
            await this.server.start();
            this.manager = new VaultManager({ autoUpdate: false });
        });

        afterEach(async function () {
            if (this.source && this.source.status === VaultSource.STATUS_UNLOCKED) {
                await this.source.lock();
            }
            await this.server.stop();
        });

        it("fails with InsecureEndpoint without the option", async function () {
            this.source = await addWebDAVSource(this.manager, endpoint);
            let error = null;
            try {
                await this.source.unlock(Credentials.fromPassword("vault-pass"), {
                    initialiseRemote: true
                });
            } catch (err) {
                error = err;
            }
            expect(getErrorCode(error)).to.equal(ErrorCode.InsecureEndpoint);
            expect(this.source.status).to.equal(VaultSource.STATUS_LOCKED);
        });

        it("unlocks with allowInsecureEndpoint and keeps the setting", async function () {
            this.source = await addWebDAVSource(this.manager, endpoint);
            await this.source.unlock(Credentials.fromPassword("vault-pass"), {
                initialiseRemote: true,
                allowInsecureEndpoint: true
            });
            expect(this.source.status).to.equal(VaultSource.STATUS_UNLOCKED);
            expect(storedDatasource(this.source).allowInsecure).to.equal(true);
            this.source.vault.findGroupsByTitle("General")[0].createEntry("Saved");
            await this.source.save();
            await this.source.lock();
            // No option this time: the setting was kept in the credentials
            await this.source.unlock(Credentials.fromPassword("vault-pass"));
            expect(this.source.vault.findEntriesByProperty("title", "Saved")).to.have.lengthOf(1);
        });

        it("does not change other datasource types", async function () {
            const credentials = Credentials.fromDatasource(
                { type: "memory", property: "b684" },
                "vault-pass"
            );
            this.source = new VaultSource("Memory", "memory", await credentials.toSecureString());
            await this.manager.addSource(this.source);
            await this.source.unlock(Credentials.fromPassword("vault-pass"), {
                initialiseRemote: true,
                allowInsecureEndpoint: true
            });
            expect(storedDatasource(this.source).type).to.equal("memory");
            expect(storedDatasource(this.source)).to.not.have.property("allowInsecure");
            expect(this.source.vault).to.be.an.instanceOf(Vault);
        });
    });
});
