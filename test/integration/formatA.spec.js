import { expect } from "chai";
import {
    Credentials,
    MemoryDatasource,
    Vault,
    VaultFormatA,
    VaultManager,
    VaultSource,
    setDefaultFormat
} from "../../dist/node/index.js";

describe("Format A", function () {
    function reduceCommandsToPadIDs(output, cmd) {
        const [method, id] = cmd.split(" ");
        if (method.toLowerCase() === "pad") {
            output.push(id);
        }
        return output;
    }

    beforeEach(function () {
        setDefaultFormat(VaultFormatA);
    });

    afterEach(function () {
        setDefaultFormat();
    });

    it("retains PAD IDs between loads", async function () {
        let vault = new Vault();
        vault.createGroup("General").createGroup("Test").createGroup("Sub");
        const memStore = `formatATest-${Math.random()}`;
        const mds = new MemoryDatasource(
            Credentials.fromDatasource(
                {
                    property: memStore
                },
                "test"
            )
        );
        const idSet1 = vault.format.getHistory().reduce(reduceCommandsToPadIDs, []);
        await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
        const { history } = await mds.load(Credentials.fromPassword("test"));
        vault = Vault.createFromHistory(history, VaultFormatA);
        const idSet2 = vault.format.getHistory().reduce(reduceCommandsToPadIDs, []);
        expect(idSet1).to.have.length.above(0);
        expect(idSet1).to.deep.equal(idSet2);
    });

    it("retains PAD IDs between saves", async function () {
        let vault = new Vault();
        vault.createGroup("General").createGroup("Test").createGroup("Sub");
        const memStore = `formatATest-${Math.random()}`;
        const mds = new MemoryDatasource(
            Credentials.fromDatasource(
                {
                    property: memStore
                },
                "test"
            )
        );
        const idSet1 = vault.format.getHistory().reduce(reduceCommandsToPadIDs, []);
        vault.createGroup("Another");
        await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
        const { history } = await mds.load(Credentials.fromPassword("test"));
        vault = Vault.createFromHistory(history, VaultFormatA);
        const idSet2 = vault.format.getHistory().reduce(reduceCommandsToPadIDs, []);
        const matchingSet = idSet2.slice(0, idSet1.length);
        expect(matchingSet).to.deep.equal(idSet1);
    });

    it("keeps a group that is moved into itself", function () {
        const vault = new Vault();
        const group = vault.createGroup("Self");
        group.createEntry("inside");
        vault.format.moveGroup(group.id, group.id);
        expect(vault.getGroups().map((g) => g.getTitle())).to.deep.equal(["Self"]);
        expect(vault.findEntriesByProperty("title", "inside")).to.have.lengthOf(1);
    });

    describe("merging", function () {
        // The source plays one device, the staged vault another: the staged
        // vault is written first, then the source saves and merges it
        beforeEach(async function () {
            const creds = Credentials.fromDatasource(
                {
                    type: "memory",
                    property: `formatAMerge:${Math.floor(Math.random() * 100000)}`
                },
                "test"
            );
            this.vaultManager = new VaultManager({ autoUpdate: false });
            this.source = new VaultSource("Test", "memory", await creds.toSecureString());
            await this.vaultManager.addSource(this.source);
            await this.source.unlock(Credentials.fromPassword("test"), { initialiseRemote: true });
            this.vault = this.source.vault;
            this.group1ID = this.vault.createGroup("G1").id;
            this.group2ID = this.vault.createGroup("G2").id;
            this.vault.findGroupByID(this.group1ID).createEntry("in G1");
            this.vault.findGroupByID(this.group2ID).createEntry("in G2");
            await this.source.save();
            const { history, Format } = await this.source._datasource.load(
                Credentials.fromPassword("test")
            );
            this.stagedVault = Vault.createFromHistory(history, Format);
            this.saveAll = async () => {
                await this.source._datasource.save(
                    this.stagedVault.format.history,
                    Credentials.fromPassword("test")
                );
                await this.source.save();
            };
        });

        it("keeps both groups and their entries after crossing group moves (B-689)", async function () {
            // One device moves G1 into G2, the other G2 into G1
            const staged1 = this.stagedVault.findGroupByID(this.group1ID);
            staged1.moveTo(this.stagedVault.findGroupByID(this.group2ID));
            const local2 = this.vault.findGroupByID(this.group2ID);
            local2.moveTo(this.vault.findGroupByID(this.group1ID));
            await this.saveAll();
            const vault = this.source.vault;
            expect(vault.findGroupByID(this.group1ID)).to.not.equal(null);
            expect(vault.findGroupByID(this.group2ID)).to.not.equal(null);
            const titles = vault.getAllEntries().map((entry) => entry.getProperty("title"));
            expect(titles).to.include.members(["in G1", "in G2"]);
            // Both groups are still reachable from the root
            const reachable = (groups) =>
                groups.flatMap((group) => [group.id, ...reachable(group.getGroups())]);
            expect(reachable(vault.getGroups())).to.include.members([this.group1ID, this.group2ID]);
        });

        it("saves after an entry is moved into a group deleted on another device (B-690)", async function () {
            // One device deletes G2, the other moves the entry in G1 into G2
            this.stagedVault.findGroupByID(this.group2ID).delete(/* skip trash: */ true);
            const entry = this.vault.findGroupByID(this.group1ID).getEntries()[0];
            entry.moveToGroup(this.vault.findGroupByID(this.group2ID));
            await this.saveAll();
            const vault = this.source.vault;
            expect(vault.findGroupByID(this.group2ID)).to.equal(null);
            // The move is dropped: the entry stays where it was
            const moved = vault.findEntryByID(entry.id);
            expect(moved).to.not.equal(null);
            expect(moved.getGroup().id).to.equal(this.group1ID);
            // A second save works too (before the fix every save failed)
            vault.findGroupByID(this.group1ID).createEntry("after");
            await this.source.save();
            expect(this.source.vault.findEntriesByProperty("title", "after")).to.have.lengthOf(1);
        });

        it("saves after a group is moved into a group deleted on another device (B-690)", async function () {
            // One device deletes G2, the other moves a new group into G2
            const subID = this.vault.createGroup("Sub").id;
            await this.source.save();
            const { history, Format } = await this.source._datasource.load(
                Credentials.fromPassword("test")
            );
            this.stagedVault = Vault.createFromHistory(history, Format);
            this.stagedVault.findGroupByID(this.group2ID).delete(/* skip trash: */ true);
            this.vault.findGroupByID(subID).moveTo(this.vault.findGroupByID(this.group2ID));
            await this.saveAll();
            const vault = this.source.vault;
            expect(vault.findGroupByID(this.group2ID)).to.equal(null);
            const sub = vault.findGroupByID(subID);
            expect(sub).to.not.equal(null);
            expect(vault.getGroups().map((group) => group.id)).to.include(subID);
            await this.source.save();
        });

        it("still applies a move into a group that was not deleted (B-690 control)", async function () {
            this.stagedVault.findGroupByID(this.group1ID).createEntry("staged edit");
            const entry = this.vault.findGroupByID(this.group1ID).getEntries()[0];
            entry.moveToGroup(this.vault.findGroupByID(this.group2ID));
            await this.saveAll();
            const moved = this.source.vault.findEntryByID(entry.id);
            expect(moved.getGroup().id).to.equal(this.group2ID);
            expect(
                this.source.vault.findEntriesByProperty("title", "staged edit")
            ).to.have.lengthOf(1);
        });
    });
});
