import { expect } from "chai";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
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
    getErrorCode,
    setDefaultFormat
} from "../../dist/node/index.js";

// B-683: the remote file is replaced with another vault that opens with the
// same master password (another of the user's vaults, or a reused password).
// Saving or updating used to merge the two into one vault and write it back

const PASSWORD = "test";

async function writeVaultFile(path, vault) {
    const fds = new FileDatasource(Credentials.fromDatasource({ type: "file", path }, PASSWORD));
    await fds.save(vault.format.getHistory(), Credentials.fromPassword(PASSWORD));
}

async function readVaultFile(path) {
    const fds = new FileDatasource(Credentials.fromDatasource({ type: "file", path }, PASSWORD));
    const { Format, history } = await fds.load(Credentials.fromPassword(PASSWORD));
    return Vault.createFromHistory(history, Format);
}

async function openSource(manager, path) {
    const credentials = Credentials.fromDatasource({ type: "file", path }, PASSWORD);
    const source = new VaultSource(path, "file", await credentials.toSecureString());
    await manager.addSource(source);
    await source.unlock(Credentials.fromPassword(PASSWORD));
    return source;
}

function titles(vault) {
    return vault
        .getAllEntries()
        .map((entry) => entry.getProperty("title"))
        .sort();
}

async function expectError(promise, code) {
    try {
        await promise;
    } catch (err) {
        expect(getErrorCode(err)).to.equal(code);
        return err;
    }
    throw new Error("Expected an error");
}

describe("a remote vault replaced by another vault", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(async function () {
                setDefaultFormat(Format);
                this.dir = mkdtempSync(join(tmpdir(), "bcup-mismatch-"));
                this.vaultPath = join(this.dir, "vault.bcup");
                this.otherPath = join(this.dir, "other.bcup");
                const mine = new Vault();
                mine.createGroup("General").createEntry("Mine");
                await writeVaultFile(this.vaultPath, mine);
                const other = new Vault();
                other.createGroup("General").createEntry("Other");
                await writeVaultFile(this.otherPath, other);
                this.otherID = other.id;
                this.manager = new VaultManager({ autoUpdate: false });
                this.source = await openSource(this.manager, this.vaultPath);
                this.vaultID = this.source.vault.id;
            });

            afterEach(function () {
                setDefaultFormat();
                rmSync(this.dir, { recursive: true, force: true });
            });

            it("refuses to save over it", async function () {
                copyFileSync(this.otherPath, this.vaultPath);
                this.source.vault.findGroupsByTitle("General")[0].createEntry("New");
                await expectError(this.source.save(), ErrorCode.VaultMismatch);
                // Nothing merged in memory or written to the file
                expect(this.source.vault.id).to.equal(this.vaultID);
                expect(titles(this.source.vault)).to.deep.equal(["Mine", "New"]);
                const onDisk = await readVaultFile(this.vaultPath);
                expect(onDisk.id).to.equal(this.otherID);
                expect(titles(onDisk)).to.deep.equal(["Other"]);
            });

            it("refuses to update from it", async function () {
                copyFileSync(this.otherPath, this.vaultPath);
                await expectError(this.source.update(), ErrorCode.VaultMismatch);
                expect(this.source.vault.id).to.equal(this.vaultID);
                expect(titles(this.source.vault)).to.deep.equal(["Mine"]);
            });

            it("still merges changes to the same vault (control)", async function () {
                const remote = await readVaultFile(this.vaultPath);
                remote.findGroupsByTitle("General")[0].createEntry("Remote");
                await writeVaultFile(this.vaultPath, remote);
                this.source.vault.findGroupsByTitle("General")[0].createEntry("Local");
                await this.source.save();
                expect(titles(this.source.vault)).to.deep.equal(["Local", "Mine", "Remote"]);
                const onDisk = await readVaultFile(this.vaultPath);
                expect(onDisk.id).to.equal(this.vaultID);
            });
        });
    });
});
