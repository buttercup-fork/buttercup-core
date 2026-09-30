import { expect } from "chai";
import { EntryChangeType, Vault, VaultFormatA, VaultFormatB } from "../../dist/node/index.js";

[
    ["Format A", VaultFormatA],
    ["Format B", VaultFormatB]
].forEach(([formatName, Format]) => {
    describe(`${formatName}: Entry#getChanges`, function () {
        beforeEach(function () {
            const vault = Vault.createWithDefaults(Format);
            this.entry = vault.getGroups()[0].createEntry("Test");
            this.entry.setProperty("note", "one");
            this.entry.setProperty("note", "two");
            this.entry.deleteProperty("note");
            this.changes = this.entry.getChanges().filter((change) => change.property === "note");
        });

        // Format B only reports previous values (its history), not the current
        // one, so it has no "modified" change for "two" here - see TODO.md.
        it("reports creation and deletion", function () {
            const types = this.changes.map((change) => change.type);
            expect(types).to.include(EntryChangeType.Created);
            expect(types).to.include(EntryChangeType.Deleted);
        });

        it("gives a created change its value", function () {
            const created = this.changes.find((change) => change.type === EntryChangeType.Created);
            expect(created).to.have.property("value", "one");
        });

        it("gives a deletion a null value", function () {
            const deleted = this.changes.find((change) => change.type === EntryChangeType.Deleted);
            expect(deleted).to.have.property("value", null);
        });
    });
});

describe("Format A: Entry#getChanges", function () {
    it("reports every value, including the current one", function () {
        const vault = Vault.createWithDefaults(VaultFormatA);
        const entry = vault.getGroups()[0].createEntry("Test");
        entry.setProperty("note", "one");
        entry.setProperty("note", "two");
        const changes = entry.getChanges().filter((change) => change.property === "note");
        expect(changes.map((change) => [change.type, change.value])).to.deep.equal([
            [EntryChangeType.Created, "one"],
            [EntryChangeType.Modified, "two"]
        ]);
    });
});
