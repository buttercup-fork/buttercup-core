import { expect } from "chai";
import {
    Credentials,
    MemoryDatasource,
    Vault,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    setDefaultFormat
} from "../../dist/node/index.js";

// Two devices share a vault. One deletes a field and saves. The other must
// see that as a change, and a save there without edits of its own must not
// write the field back (B-691).

async function openSource(property) {
    const credentials = Credentials.fromDatasource({ type: "memory", property }, "test");
    const source = new VaultSource("Test", "memory", await credentials.toSecureString());
    await new VaultManager({ autoUpdate: false }).addSource(source);
    await source.unlock(Credentials.fromPassword("test"));
    return source;
}

function entryOf(source) {
    return source.vault.findEntriesByProperty("title", "Bank")[0];
}

describe("a field deleted on another device (B-691)", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(async function () {
                setDefaultFormat(Format);
                this.property = `delfield${Math.random()}`;
                const vault = new Vault();
                const entry = vault.createGroup("General").createEntry("Bank");
                entry.setProperty("oldpin", "1234");
                entry.setAttribute("NOTE_ATTR", "old note");
                const mds = new MemoryDatasource(
                    Credentials.fromDatasource({ type: "memory", property: this.property }, "test")
                );
                await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
                this.deviceA = await openSource(this.property);
                this.deviceB = await openSource(this.property);
            });

            afterEach(function () {
                setDefaultFormat();
            });

            it("reports a deleted property as a change", async function () {
                entryOf(this.deviceA).deleteProperty("oldpin");
                await this.deviceA.save();
                expect(await this.deviceB.localDiffersFromRemote()).to.equal(true);
            });

            it("reports a deleted attribute as a change", async function () {
                entryOf(this.deviceA).deleteAttribute("NOTE_ATTR");
                await this.deviceA.save();
                expect(await this.deviceB.localDiffersFromRemote()).to.equal(true);
            });

            it("does not write a deleted property back on a save without edits", async function () {
                entryOf(this.deviceA).deleteProperty("oldpin");
                await this.deviceA.save();
                await this.deviceB.save();
                expect(entryOf(this.deviceB).getProperty("oldpin")).to.equal(undefined);
                const deviceC = await openSource(this.property);
                expect(entryOf(deviceC).getProperty("oldpin")).to.equal(undefined);
            });

            it("does not write a deleted attribute back on a save without edits", async function () {
                entryOf(this.deviceA).deleteAttribute("NOTE_ATTR");
                await this.deviceA.save();
                await this.deviceB.save();
                expect(entryOf(this.deviceB).getAttribute("NOTE_ATTR")).to.equal(undefined);
                const deviceC = await openSource(this.property);
                expect(entryOf(deviceC).getAttribute("NOTE_ATTR")).to.equal(undefined);
            });

            it("reports no change when the other device changed nothing (control)", async function () {
                await this.deviceA.save();
                expect(await this.deviceB.localDiffersFromRemote()).to.equal(false);
            });
        });
    });
});
