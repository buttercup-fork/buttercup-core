import { expect } from "chai";
import {
    Credentials,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    setDefaultFormat
} from "../../dist/node/index.js";

async function createNewSource(unlockOptions = {}) {
    const credentials = Credentials.fromDatasource(
        { type: "memory", property: `titles${Math.random()}` },
        "test"
    );
    const source = new VaultSource("Test", "memory", await credentials.toSecureString());
    await new VaultManager({ autoUpdate: false }).addSource(source);
    await source.unlock(Credentials.fromPassword("test"), {
        initialiseRemote: true,
        ...unlockOptions
    });
    return source;
}

function groupTitles(source) {
    return source.vault.getGroups().map((group) => group.getTitle());
}

describe("default group titles for new vaults", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            beforeEach(function () {
                setDefaultFormat(Format);
            });

            afterEach(function () {
                setDefaultFormat();
            });

            it("uses English titles by default", async function () {
                const source = await createNewSource();
                expect(groupTitles(source)).to.deep.equal(["General", "Trash"]);
            });

            it("uses translated titles when given", async function () {
                const source = await createNewSource({
                    defaultGroupTitles: { general: "Allgemein", trash: "Papierkorb" }
                });
                expect(groupTitles(source)).to.deep.equal(["Allgemein", "Papierkorb"]);
                expect(source.vault.getTrashGroup().getTitle()).to.equal("Papierkorb");
            });

            it("keeps translated titles and the Trash role after reopening", async function () {
                const source = await createNewSource({
                    defaultGroupTitles: { general: "Général", trash: "Corbeille" }
                });
                await source.save();
                await source.lock();
                await source.unlock(Credentials.fromPassword("test"));
                expect(groupTitles(source)).to.deep.equal(["Général", "Corbeille"]);
                const trash = source.vault.getTrashGroup();
                expect(trash.getTitle()).to.equal("Corbeille");
                const entry = source.vault.findGroupsByTitle("Général")[0].createEntry("Login");
                entry.delete();
                expect(entry.isInTrash()).to.be.true;
            });
        });
    });
});
