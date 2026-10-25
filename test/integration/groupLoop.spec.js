import { expect } from "chai";
import {
    Credentials,
    MemoryDatasource,
    Vault,
    VaultEntrySearch,
    VaultFormatB,
    VaultManager,
    VaultSource,
    getEntryFacadePath,
    getEntryPath,
    setDefaultFormat
} from "../../dist/node/index.js";

// Format B stores a parent ID per group, so a crafted or broken vault file
// can hold a parent loop (a group that is its own parent, or A -> B -> A).
// Every walk up the parent chain used to run forever on such a vault, which
// froze the app on its first Trash check or search (B-692). Format A stores
// groups as a tree and cannot hold a loop.

function reachableGroupIDs(vault) {
    const walk = (groups) => groups.flatMap((group) => [group.id, ...walk(group.getGroups())]);
    return walk(vault.getGroups());
}

async function saveAndOpen(vault) {
    const property = `grouploop${Math.random()}`;
    const mds = new MemoryDatasource(
        Credentials.fromDatasource({ type: "memory", property }, "test")
    );
    await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
    const credentials = Credentials.fromDatasource({ type: "memory", property }, "test");
    const source = new VaultSource("Test", "memory", await credentials.toSecureString());
    await new VaultManager({ autoUpdate: false }).addSource(source);
    await source.unlock(Credentials.fromPassword("test"));
    return source;
}

describe("a vault with a group loop (B-692)", function () {
    beforeEach(function () {
        setDefaultFormat(VaultFormatB);
        this.vault = Vault.createWithDefaults();
        this.outside = this.vault.findGroupsByTitle("General")[0].createEntry("outside");
        this.loopGroup = this.vault.createGroup("Loop");
        this.loopGroup.createEntry("inside");
        this.otherGroup = this.loopGroup.createGroup("Other");
        this.otherGroup.createEntry("deeper");
    });

    afterEach(function () {
        setDefaultFormat();
    });

    [
        [
            "a group that is its own parent",
            true,
            (t) => t.vault.format.moveGroup(t.loopGroup.id, t.loopGroup.id)
        ],
        [
            "two groups that are each other's parent",
            false,
            (t) => t.vault.format.moveGroup(t.loopGroup.id, t.otherGroup.id)
        ]
    ].forEach(([name, selfLoop, makeLoop]) => {
        describe(name, function () {
            beforeEach(function () {
                makeLoop(this);
                this.makesSelfLoop = selfLoop;
            });

            it("returns from Trash checks, group lookups and searches without optimising", function () {
                const vault = Vault.createFromHistory(this.vault.format.getHistory(), VaultFormatB);
                const outside = vault.findEntryByID(this.outside.id);
                expect(outside.isInTrash()).to.equal(false);
                expect(vault.findGroupByID(this.otherGroup.id)).to.not.equal(null);
                expect(vault.getTrashGroup().findGroupByID(this.loopGroup.id)).to.equal(null);
                const search = new VaultEntrySearch([vault]);
                return search.prepare().then(() => {
                    expect(search.searchByTerm("outside").map((r) => r.id)).to.include(
                        this.outside.id
                    );
                });
            });

            it("returns entry paths without optimising", function () {
                const vault = Vault.createFromHistory(this.vault.format.getHistory(), VaultFormatB);
                const deeper = vault.findEntriesByProperty("title", "deeper")[0];
                const path = getEntryPath(deeper);
                expect(path).to.include(this.otherGroup.id);
                expect(new Set(path).size).to.equal(path.length);
            });

            it("returns entry facade paths for a looped facade", function () {
                // createVaultFacade only includes groups reachable from the
                // root, so a looped facade is built by hand (as an app or an
                // import file could pass one)
                const facade = {
                    groups: [
                        { id: "a", parentID: this.makesSelfLoop ? "a" : "b" },
                        { id: "b", parentID: "a" }
                    ],
                    entries: [{ id: "e", parentID: "b" }]
                };
                const facadePath = getEntryFacadePath("e", facade);
                expect(facadePath).to.include.members(["a", "b"]);
                expect(new Set(facadePath).size).to.equal(facadePath.length);
            });

            it("reattaches the loop when the vault is opened, so every group and entry is reachable", async function () {
                const source = await saveAndOpen(this.vault);
                const vault = source.vault;
                const reachable = reachableGroupIDs(vault);
                expect(reachable).to.include.members([this.loopGroup.id, this.otherGroup.id]);
                const titles = vault
                    .getAllEntries()
                    .filter((entry) => !entry.isInTrash())
                    .map((entry) => entry.getProperty("title"));
                expect(titles).to.include.members(["outside", "inside", "deeper"]);
                // And it saves
                await source.save();
            });
        });
    });

    it("refuses to move a group into itself", function () {
        expect(() => this.loopGroup.moveTo(this.loopGroup)).to.throw(/itself/);
        expect(this.loopGroup.getParentGroup()).to.equal(null);
    });

    it("leaves a vault without a loop as it was (control)", async function () {
        const before = reachableGroupIDs(this.vault).sort();
        const source = await saveAndOpen(this.vault);
        expect(reachableGroupIDs(source.vault).sort()).to.deep.equal(before);
        expect(source.vault.findEntryByID(this.outside.id).isInTrash()).to.equal(false);
    });
});
