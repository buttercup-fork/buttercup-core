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

// Two devices share a vault; one permanently deletes items (skipping the
// trash, or emptying it). The other device still has them loaded, and its
// next save merges the deletion in - which used to leave dangling items
// that crashed the save ("Cannot read properties of null").

async function openSource(property) {
    const credentials = Credentials.fromDatasource({ type: "memory", property }, "test");
    const source = new VaultSource("Test", "memory", await credentials.toSecureString());
    await new VaultManager({ autoUpdate: false }).addSource(source);
    await source.unlock(Credentials.fromPassword("test"));
    return source;
}

function titles(source) {
    return source.vault
        .getAllEntries()
        .map((entry) => entry.getProperty("title"))
        .sort();
}

describe("saving after another device permanently deleted items", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(async function () {
                setDefaultFormat(Format);
                const property = `permdel${Math.random()}`;
                const vault = new Vault();
                const general = vault.createGroup("General");
                general.createEntry("Keep");
                general.createEntry("Gone");
                general.createGroup("Old stuff").createEntry("Old entry");
                const mds = new MemoryDatasource(
                    Credentials.fromDatasource({ type: "memory", property }, "test")
                );
                await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
                this.deviceA = await openSource(property);
                this.deviceB = await openSource(property);
            });

            afterEach(function () {
                setDefaultFormat();
            });

            it("saves after an entry was permanently deleted", async function () {
                this.deviceA.vault.findEntriesByProperty("title", "Gone")[0].delete(true);
                await this.deviceA.save();
                this.deviceB.vault
                    .findEntriesByProperty("title", "Keep")[0]
                    .setProperty("username", "jane");
                await this.deviceB.save();
                expect(titles(this.deviceB)).to.deep.equal(["Keep", "Old entry"]);
                expect(
                    this.deviceB.vault
                        .findEntriesByProperty("title", "Keep")[0]
                        .getProperty("username")
                ).to.equal("jane");
            });

            it("saves after a group was permanently deleted", async function () {
                this.deviceA.vault.findGroupsByTitle("Old stuff")[0].delete(true);
                await this.deviceA.save();
                this.deviceB.vault
                    .findEntriesByProperty("title", "Keep")[0]
                    .setProperty("username", "jane");
                await this.deviceB.save();
                expect(this.deviceB.vault.findGroupsByTitle("Old stuff")).to.have.lengthOf(0);
                expect(titles(this.deviceB)).to.deep.equal(["Gone", "Keep"]);
            });

            it("keeps the deletion after reopening", async function () {
                this.deviceA.vault.findEntriesByProperty("title", "Gone")[0].delete(true);
                await this.deviceA.save();
                await this.deviceB.save();
                await this.deviceB.lock();
                await this.deviceB.unlock(Credentials.fromPassword("test"));
                expect(titles(this.deviceB)).to.deep.equal(["Keep", "Old entry"]);
            });
        });
    });
});
