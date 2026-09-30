import { expect } from "chai";
import { EntryChangeType, Vault, VaultFormatA, VaultFormatB } from "../../dist/node/index.js";

// Entry#getChanges lists previous values only, oldest first - the current
// value is the field itself (desktop shows the changes as "Previous Value")
function noteChanges(entry) {
    return entry
        .getChanges()
        .filter((change) => change.property === "note")
        .map((change) => [change.type, change.value]);
}

[
    ["Format A", VaultFormatA],
    ["Format B", VaultFormatB]
].forEach(([formatName, Format]) => {
    describe(`${formatName}: Entry#getChanges`, function () {
        beforeEach(function () {
            this.vault = Vault.createWithDefaults(Format);
            this.entry = this.vault.getGroups()[0].createEntry("Test");
        });

        it("has no changes for a value set once", function () {
            this.entry.setProperty("note", "one");
            expect(noteChanges(this.entry)).to.deep.equal([]);
        });

        it("lists previous values oldest first, without the current one", function () {
            this.entry.setProperty("note", "one");
            this.entry.setProperty("note", "two");
            this.entry.setProperty("note", "three");
            expect(noteChanges(this.entry)).to.deep.equal([
                [EntryChangeType.Created, "one"],
                [EntryChangeType.Modified, "two"]
            ]);
        });

        it("keeps the last value of a deleted property, then the deletion", function () {
            this.entry.setProperty("note", "one");
            this.entry.setProperty("note", "two");
            this.entry.deleteProperty("note");
            expect(noteChanges(this.entry)).to.deep.equal([
                [EntryChangeType.Created, "one"],
                [EntryChangeType.Modified, "two"],
                [EntryChangeType.Deleted, null]
            ]);
        });

        it("reports a value deleted straight after being set", function () {
            this.entry.setProperty("note", "one");
            this.entry.deleteProperty("note");
            expect(noteChanges(this.entry)).to.deep.equal([
                [EntryChangeType.Created, "one"],
                [EntryChangeType.Deleted, null]
            ]);
        });

        it("survives a history round trip", function () {
            this.entry.setProperty("note", "one");
            this.entry.setProperty("note", "two");
            const copy = Vault.createFromHistory(this.vault.format.getHistory(), Format);
            expect(noteChanges(copy.findEntryByID(this.entry.id))).to.deep.equal([
                [EntryChangeType.Created, "one"]
            ]);
        });
    });
});
