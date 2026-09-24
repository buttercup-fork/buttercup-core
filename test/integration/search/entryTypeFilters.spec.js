import { expect } from "chai";
import {
    Entry,
    EntryType,
    MemoryStorageInterface,
    Vault,
    VaultEntrySearch,
    VaultFacadeEntrySearch,
    createVaultFacade
} from "../../../dist/node/index.js";
import { extractEntryTypesFromSearchTerm } from "../../../dist/node/search/entryTypes.js";

function createTypedVault() {
    const vault = Vault.createWithDefaults();
    const general = vault.findGroupsByTitle("General")[0];
    const add = (title, type, tags = []) => {
        const entry = general.createEntry(title).setProperty("username", "jane");
        if (type) entry.setAttribute(Entry.Attributes.FacadeType, type);
        if (tags.length > 0) entry.addTags(...tags);
        return entry;
    };
    add("Work email", EntryType.Login, ["work"]);
    add("Home email", null); // No type set: a login
    add("Company card", EntryType.CreditCard, ["work", "finance"]);
    add("Personal card", EntryType.CreditCard, ["finance"]);
    add("Server key", EntryType.SSHKey, ["work"]);
    add("Wifi notes", EntryType.Note);
    add("Old card", EntryType.CreditCard).delete(); // In Trash
    return vault;
}

function titles(results) {
    return results.map((result) => result.properties.title).sort();
}

describe("entry type filters", function () {
    describe("extractEntryTypesFromSearchTerm", function () {
        it("extracts known entry types", function () {
            expect(extractEntryTypesFromSearchTerm("type:login")).to.deep.equal({
                entryTypes: [EntryType.Login],
                term: ""
            });
        });

        it("keeps the rest of the term, including tags", function () {
            expect(extractEntryTypesFromSearchTerm("mail type:note #work  home")).to.deep.equal({
                entryTypes: [EntryType.Note],
                term: "mail #work home"
            });
        });

        it("accepts any case and spelling of multi-word types", function () {
            ["type:credit_card", "type:creditcard", "type:Credit-Card", "TYPE:CREDIT_CARD"].forEach(
                (term) => {
                    expect(extractEntryTypesFromSearchTerm(term).entryTypes).to.deep.equal([
                        EntryType.CreditCard
                    ]);
                }
            );
            expect(extractEntryTypesFromSearchTerm("type:sshkey").entryTypes).to.deep.equal([
                EntryType.SSHKey
            ]);
        });

        it("extracts several types, once each", function () {
            expect(
                extractEntryTypesFromSearchTerm("type:login type:note type:login").entryTypes
            ).to.deep.equal([EntryType.Login, EntryType.Note]);
        });

        it("leaves unknown types in the search term", function () {
            expect(extractEntryTypesFromSearchTerm("type:foo bar")).to.deep.equal({
                entryTypes: [],
                term: "type:foo bar"
            });
            expect(extractEntryTypesFromSearchTerm("type:").term).to.equal("type:");
        });
    });

    [
        [
            "VaultEntrySearch",
            (vault) => new VaultEntrySearch([vault], new MemoryStorageInterface())
        ],
        [
            "VaultFacadeEntrySearch",
            (vault) =>
                new VaultFacadeEntrySearch([createVaultFacade(vault)], new MemoryStorageInterface())
        ]
    ].forEach(([name, createSearch]) => {
        describe(`${name}#searchByTerm`, function () {
            beforeEach(async function () {
                this.search = createSearch(createTypedVault());
                await this.search.prepare();
            });

            it("returns every entry of a type, excluding Trash", function () {
                expect(titles(this.search.searchByTerm("type:credit_card"))).to.deep.equal([
                    "Company card",
                    "Personal card"
                ]);
            });

            it("treats entries without a type as logins", function () {
                expect(titles(this.search.searchByTerm("type:login"))).to.deep.equal([
                    "Home email",
                    "Work email"
                ]);
            });

            it("returns entries of any of several types", function () {
                expect(titles(this.search.searchByTerm("type:ssh_key type:note"))).to.deep.equal([
                    "Server key",
                    "Wifi notes"
                ]);
            });

            it("combines types with tags", function () {
                expect(titles(this.search.searchByTerm("type:credit_card #work"))).to.deep.equal([
                    "Company card"
                ]);
                expect(titles(this.search.searchByTerm("#finance type:creditcard"))).to.deep.equal([
                    "Company card",
                    "Personal card"
                ]);
            });

            it("combines types with search text", function () {
                expect(titles(this.search.searchByTerm("type:login work"))).to.deep.equal([
                    "Work email"
                ]);
            });

            it("returns nothing when no entries are of the type", function () {
                expect(this.search.searchByTerm("type:website")).to.deep.equal([]);
            });

            it("searches normally again after a filtered search", function () {
                this.search.searchByTerm("type:note");
                expect(titles(this.search.searchByTerm("card"))).to.include.members([
                    "Company card",
                    "Personal card"
                ]);
            });
        });
    });
});
