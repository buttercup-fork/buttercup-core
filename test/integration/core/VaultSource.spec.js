import { expect } from "chai";
import {
    Credentials,
    ErrorCode,
    getErrorCode,
    MemoryDatasource,
    Vault,
    VaultFormatA,
    VaultFormatB,
    VaultFormatID,
    VaultManager,
    VaultSource,
    setDefaultFormat,
    VaultSourceStatus
} from "../../../dist/node/index.js";

// A datasource request that only finishes when told to, like a stalled remote
function stallSaves(source) {
    const stalled = { finish: null };
    source._datasource.save = () =>
        new Promise((resolve) => {
            stalled.finish = () => resolve("");
        });
    return stalled;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

async function untilRequestSent(stalled) {
    while (!stalled.finish) await tick();
}

async function createTextSourceCredentials() {
    const memoryProperty = `test${Math.random()}`;
    const vault = new Vault();
    const general = vault.createGroup("General");
    general.createEntry("Login").setProperty("username", "user").setProperty("password", "test");
    const mds = new MemoryDatasource(
        Credentials.fromDatasource({ type: "memory", property: memoryProperty }, "test")
    );
    const encrypted = await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
    return Credentials.fromDatasource(
        {
            type: "memory",
            content: encrypted,
            property: memoryProperty
        },
        "test"
    );
}

describe("VaultSource", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(async function () {
                setDefaultFormat(Format);
                this.sourceCredentials = await createTextSourceCredentials();
                this.vaultSource = new VaultSource(
                    "Test",
                    "text",
                    await this.sourceCredentials.toSecureString()
                );
                this.vaultManager = new VaultManager();
                await this.vaultManager.addSource(this.vaultSource);
            });

            afterEach(function () {
                setDefaultFormat();
            });

            describe("while locked", function () {
                describe("testMasterPassword", function () {
                    it("returns true for matching password", async function () {
                        const res = await this.vaultSource.testMasterPassword("test");
                        expect(res).to.be.true;
                    });

                    it("returns false for non-matching password", async function () {
                        const res = await this.vaultSource.testMasterPassword("abc");
                        expect(res).to.be.false;
                    });
                });
            });

            describe("while unlocked", function () {
                beforeEach(async function () {
                    await this.vaultSource.unlock(Credentials.fromPassword("test"));
                });

                it("sets source ID on datasource", function () {
                    expect(this.vaultSource._datasource.sourceID).to.equal(this.vaultSource.id);
                });

                if (Format === VaultFormatA) {
                    describe("convert", function () {
                        it("converts from format A to B", async function () {
                            await this.vaultSource.convert(VaultFormatID.B);
                            const [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                                "title",
                                "Login"
                            );
                            expect(loginEntry.getProperty("username")).to.equal("user");
                        });
                    });
                }

                describe("using live snapshots", function () {
                    it("can collect relevant data", function () {
                        const snapshot = this.vaultSource.getLiveSnapshot();
                        expect(snapshot)
                            .to.have.nested.property("credentials.data")
                            .that.is.an("object");
                        expect(snapshot).to.have.property("formatID", Format.getFormatID());
                        expect(snapshot).to.have.property("version", "1a");
                    });

                    it("can restore vault source unlocked state", async function () {
                        const snapshot = this.vaultSource.getLiveSnapshot();
                        await this.vaultSource.lock();
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Locked);
                        expect(this.vaultSource.attachmentManager).to.be.null;
                        await this.vaultSource.restoreFromLiveSnapshot(snapshot);
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Unlocked);
                        expect(this.vaultSource.attachmentManager).to.not.be.null;
                        const passwordWorks = await this.vaultSource.testMasterPassword("test");
                        expect(passwordWorks).to.equal(true, "Password should match");
                    });
                });

                describe("save", function () {
                    it("saves changes", async function () {
                        let [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        loginEntry.setProperty("username", "user2");
                        await this.vaultSource.save();
                        await this.vaultSource.lock();
                        await this.vaultSource.unlock(Credentials.fromPassword("test"));
                        [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        expect(loginEntry.getProperty("username")).to.equal("user2");
                    });

                    it("saves new properties", async function () {
                        let [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        loginEntry.setProperty("extra", "123");
                        await this.vaultSource.save();
                        await this.vaultSource.lock();
                        await this.vaultSource.unlock(Credentials.fromPassword("test"));
                        [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        expect(loginEntry.getProperty("extra")).to.equal("123");
                    });
                });

                describe("lock", function () {
                    it("locks once when asked twice at the same time (buttercup-desktop#1317)", async function () {
                        const results = await Promise.allSettled([
                            this.vaultSource.lock(),
                            this.vaultSource.lock()
                        ]);
                        expect(results.map((result) => result.status)).to.deep.equal([
                            "fulfilled",
                            "fulfilled"
                        ]);
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Locked);
                        await this.vaultSource.unlock(Credentials.fromPassword("test"));
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Unlocked);
                        expect(this.vaultSource.vault).to.be.an.instanceOf(Vault);
                    });

                    it("waits for a running save, unless forced (B-359)", async function () {
                        const stalled = stallSaves(this.vaultSource);
                        const saving = this.vaultSource.save();
                        await untilRequestSent(stalled);
                        let locked = false;
                        const lockAfterSave = this.vaultSource.lock().then(() => {
                            locked = true;
                        });
                        const settled = Promise.allSettled([saving, lockAfterSave]);
                        await tick();
                        expect(locked).to.be.false;
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Unlocked);
                        await this.vaultSource.lock({ force: true });
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Locked);
                        const dropped = await settled;
                        expect(dropped.map((result) => result.status)).to.deep.equal([
                            "rejected",
                            "rejected"
                        ]);
                        dropped.forEach((result) => {
                            expect(getErrorCode(result.reason)).to.equal(ErrorCode.SourceLocked);
                        });
                    });

                    it("unlocks again after a forced lock while a save is stuck (B-359)", async function () {
                        const stalled = stallSaves(this.vaultSource);
                        this.vaultSource.save().catch(() => {});
                        await untilRequestSent(stalled);
                        await this.vaultSource.lock({ force: true });
                        await this.vaultSource.unlock(Credentials.fromPassword("test"));
                        expect(this.vaultSource.status).to.equal(VaultSourceStatus.Unlocked);
                        const [loginEntry] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        loginEntry.setProperty("username", "user2");
                        const dirty = this.vaultSource.vault.format.dirty;
                        // The old request finishes late: it must not touch the new session
                        stalled.finish();
                        await tick();
                        expect(this.vaultSource.vault.format.dirty).to.equal(dirty);
                        await this.vaultSource.save();
                        await this.vaultSource.lock();
                        await this.vaultSource.unlock(Credentials.fromPassword("test"));
                        const [saved] = this.vaultSource.vault.findEntriesByProperty(
                            "title",
                            "Login"
                        );
                        expect(saved.getProperty("username")).to.equal("user2");
                    });

                    it("still stores the source after a forced lock (B-359)", async function () {
                        const stalled = stallSaves(this.vaultSource);
                        this.vaultSource.save().catch(() => {});
                        const dehydrating = this.vaultSource.dehydrate();
                        await untilRequestSent(stalled);
                        await this.vaultSource.lock({ force: true });
                        const stored = JSON.parse(await dehydrating);
                        expect(stored.id).to.equal(this.vaultSource.id);
                        expect(stored.credentials).to.be.a("string").that.is.not.empty;
                    });

                    it("still refuses to lock a locked source", async function () {
                        await this.vaultSource.lock();
                        let lockError = null;
                        try {
                            await this.vaultSource.lock();
                        } catch (err) {
                            lockError = err;
                        }
                        expect(lockError)
                            .to.be.an("error")
                            .with.property("message")
                            .that.matches(/invalid state \(locked\)/);
                    });
                });

                describe("testMasterPassword", function () {
                    it("returns true for matching password", async function () {
                        const res = await this.vaultSource.testMasterPassword("test");
                        expect(res).to.be.true;
                    });

                    it("returns false for non-matching password", async function () {
                        const res = await this.vaultSource.testMasterPassword("abc");
                        expect(res).to.be.false;
                    });
                });
            });
        });
    });
});
