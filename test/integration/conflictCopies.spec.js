import { expect } from "chai";
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    Credentials,
    ErrorCode,
    FileDatasource,
    Vault,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    findConflictCopies,
    getErrorCode,
    setDefaultFormat
} from "../../dist/node/index.js";

const PASSWORD = "test";

async function writeVaultFile(path, vault, password = PASSWORD) {
    const fds = new FileDatasource(Credentials.fromDatasource({ type: "file", path }, password));
    await fds.save(vault.format.getHistory(), Credentials.fromPassword(password));
}

async function openSource(manager, path, password = PASSWORD) {
    const credentials = Credentials.fromDatasource({ type: "file", path }, password);
    const source = new VaultSource(path, "file", await credentials.toSecureString());
    await manager.addSource(source);
    await source.unlock(Credentials.fromPassword(password));
    return source;
}

function fileCredentials(path, password = PASSWORD) {
    return Credentials.fromDatasource({ type: "file", path }, password);
}

function findEntry(source, title) {
    return source.vault.findEntriesByProperty("title", title)[0] || null;
}

async function expectMergeError(promise, code) {
    try {
        await promise;
    } catch (err) {
        expect(getErrorCode(err)).to.equal(code);
        return err;
    }
    throw new Error("Expected merge to fail");
}

describe("conflict copies", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(async function () {
                setDefaultFormat(Format);
                this.dir = mkdtempSync(join(tmpdir(), "bcup-conflict-"));
                this.vaultPath = join(this.dir, "vault.bcup");
                this.conflictPath = join(
                    this.dir,
                    "vault (Jane's conflicted copy 2026-09-24).bcup"
                );
                const vault = new Vault();
                const general = vault.createGroup("General");
                general.createEntry("Email").setProperty("username", "jane");
                general.createEntry("Bank").setProperty("username", "jane-bank");
                await writeVaultFile(this.vaultPath, vault);
                // Both devices start from the same file, then diverge: the
                // sync service keeps the other device's version as a copy
                copyFileSync(this.vaultPath, this.conflictPath);
                this.manager = new VaultManager({ autoUpdate: false });
                const other = await openSource(this.manager, this.conflictPath);
                findEntry(other, "Email").setProperty("password", "from-laptop");
                other.vault
                    .findGroupsByTitle("General")[0]
                    .createEntry("Forum")
                    .setProperty("username", "jane-forum");
                await other.save();
                await other.lock();
                this.source = await openSource(this.manager, this.vaultPath);
                findEntry(this.source, "Bank").setProperty("password", "from-desktop");
                await this.source.save();
            });

            afterEach(function () {
                setDefaultFormat();
                rmSync(this.dir, { recursive: true, force: true });
            });

            it("finds the conflict copy in the vault's directory", function () {
                const copies = findConflictCopies(
                    this.vaultPath,
                    readdirSync(this.dir).map((file) => join(this.dir, file))
                );
                expect(copies).to.deep.equal([this.conflictPath]);
            });

            it("merges changes from both copies", async function () {
                await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                expect(findEntry(this.source, "Email").getProperty("password")).to.equal(
                    "from-laptop"
                );
                expect(findEntry(this.source, "Bank").getProperty("password")).to.equal(
                    "from-desktop"
                );
                expect(findEntry(this.source, "Forum").getProperty("username")).to.equal(
                    "jane-forum"
                );
            });

            it("does not duplicate entries or groups", async function () {
                await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                const titles = this.source.vault
                    .getAllEntries()
                    .map((entry) => entry.getProperty("title"))
                    .sort();
                expect(titles).to.deep.equal(["Bank", "Email", "Forum"]);
                expect(this.source.vault.findGroupsByTitle("General")).to.have.lengthOf(1);
            });

            it("keeps the merge after saving and reopening", async function () {
                await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                await this.source.save();
                await this.source.lock();
                await this.source.unlock(Credentials.fromPassword(PASSWORD));
                expect(findEntry(this.source, "Email").getProperty("password")).to.equal(
                    "from-laptop"
                );
                expect(findEntry(this.source, "Bank").getProperty("password")).to.equal(
                    "from-desktop"
                );
                expect(findEntry(this.source, "Forum")).to.not.be.null;
            });

            it("marks the vault as changed", async function () {
                expect(this.source.vault.format.dirty).to.be.false;
                await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                expect(this.source.vault.format.dirty).to.be.true;
            });

            it("emits 'updated'", async function () {
                let updated = 0;
                this.source.on("updated", () => {
                    updated += 1;
                });
                await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                expect(updated).to.be.greaterThan(0);
            });

            it("rejects a different vault", async function () {
                const otherPath = join(this.dir, "vault (conflicted copy 2026-09-25).bcup");
                const unrelated = new Vault();
                unrelated.createGroup("General").createEntry("Stranger");
                await writeVaultFile(otherPath, unrelated);
                await expectMergeError(
                    this.source.mergeFromCredentials(fileCredentials(otherPath)),
                    ErrorCode.VaultMismatch
                );
                expect(findEntry(this.source, "Stranger")).to.be.null;
                expect(findEntry(this.source, "Forum")).to.be.null;
            });

            it("rejects a copy with the wrong password", async function () {
                await expectMergeError(
                    this.source.mergeFromCredentials(fileCredentials(this.conflictPath, "wrong")),
                    ErrorCode.DecryptionFailed
                );
                expect(findEntry(this.source, "Forum")).to.be.null;
            });

            it("merges a copy saved with a different password", async function () {
                const other = await openSource(this.manager, this.conflictPath);
                await other.changeMasterPassword(PASSWORD, "laptop-password");
                await other.lock();
                await this.source.mergeFromCredentials(
                    fileCredentials(this.conflictPath, "laptop-password")
                );
                expect(findEntry(this.source, "Forum")).to.not.be.null;
            });

            it("requires the source to be unlocked", async function () {
                await this.source.lock();
                let error = null;
                try {
                    await this.source.mergeFromCredentials(fileCredentials(this.conflictPath));
                } catch (err) {
                    error = err;
                }
                expect(error).to.be.an("error");
                expect(error.message).to.match(/not unlocked/i);
            });

            it("rejects invalid credentials", async function () {
                let error = null;
                try {
                    await this.source.mergeFromCredentials({ type: "file" });
                } catch (err) {
                    error = err;
                }
                expect(error).to.be.an("error");
                expect(error.message).to.match(/invalid credentials/i);
            });
        });
    });

    describe("across vault formats", function () {
        afterEach(function () {
            setDefaultFormat();
            rmSync(this.dir, { recursive: true, force: true });
        });

        it("rejects a Format A copy of a Format B vault", async function () {
            this.dir = mkdtempSync(join(tmpdir(), "bcup-conflict-"));
            const vaultPath = join(this.dir, "vault.bcup");
            const conflictPath = join(this.dir, "vault (conflicted copy 2026-09-24 101500).bcup");
            setDefaultFormat(VaultFormatA);
            const vault = new Vault();
            vault.createGroup("General").createEntry("Email");
            await writeVaultFile(vaultPath, vault);
            copyFileSync(vaultPath, conflictPath);
            const manager = new VaultManager({ autoUpdate: false });
            const source = await openSource(manager, vaultPath);
            await source.convert("b");
            await expectMergeError(
                source.mergeFromCredentials(fileCredentials(conflictPath)),
                ErrorCode.VaultFormatMismatch
            );
        });
    });

    describe("deletions (Format B)", function () {
        beforeEach(async function () {
            setDefaultFormat(VaultFormatB);
            this.dir = mkdtempSync(join(tmpdir(), "bcup-conflict-"));
            this.vaultPath = join(this.dir, "vault.bcup");
            this.conflictPath = join(this.dir, "vault.sync-conflict-20260924-101500-ABCDEFG.bcup");
            const vault = new Vault();
            const general = vault.createGroup("General");
            general.createEntry("Email").setProperty("username", "jane").setProperty("pin", "1234");
            general.createEntry("Old account");
            await writeVaultFile(this.vaultPath, vault);
            copyFileSync(this.vaultPath, this.conflictPath);
            this.manager = new VaultManager({ autoUpdate: false });
        });

        afterEach(function () {
            setDefaultFormat();
            rmSync(this.dir, { recursive: true, force: true });
        });

        it("keeps deletions made in the conflict copy", async function () {
            const other = await openSource(this.manager, this.conflictPath);
            findEntry(other, "Email").deleteProperty("pin");
            findEntry(other, "Old account").delete(/* skip trash */ true);
            await other.save();
            await other.lock();
            const source = await openSource(this.manager, this.vaultPath);
            await source.mergeFromCredentials(fileCredentials(this.conflictPath));
            expect(findEntry(source, "Email").getProperty("pin")).to.be.undefined;
            expect(findEntry(source, "Old account")).to.be.null;
        });

        it("keeps deletions made in the vault", async function () {
            const source = await openSource(this.manager, this.vaultPath);
            findEntry(source, "Email").deleteProperty("pin");
            findEntry(source, "Old account").delete(/* skip trash */ true);
            await source.save();
            await source.mergeFromCredentials(fileCredentials(this.conflictPath));
            expect(findEntry(source, "Email").getProperty("pin")).to.be.undefined;
            expect(findEntry(source, "Old account")).to.be.null;
        });
    });
});
