import { expect } from "chai";
import {
    Credentials,
    Entry,
    EntryPropertyValueType,
    Vault,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    consumeEntryFacade,
    createEntryFacade,
    setDefaultFormat
} from "../../dist/node/index.js";

const QUEUE = Entry.SingleUsePasswordsProperty;

describe("Single-use passwords", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                this.general = this.vault.findGroupsByTitle("General")[0];
                this.entry = this.general
                    .createEntry("Bank")
                    .setProperty("username", "jane")
                    .setSingleUsePasswords(["one", "two", "three"]);
            });

            describe("setSingleUsePasswords", function () {
                it("puts the first password in the password field, queuing the rest", function () {
                    expect(this.entry.hasSingleUsePasswords()).to.equal(true);
                    expect(this.entry.getProperty("password")).to.equal("one");
                    expect(this.entry.getProperty(QUEUE)).to.equal("two\nthree");
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal([
                        "one",
                        "two",
                        "three"
                    ]);
                });

                it("hides the queue as a password field", function () {
                    expect(this.entry.getPropertyValueType(QUEUE)).to.equal(
                        EntryPropertyValueType.Password
                    );
                });

                it("doesn't queue anything for a single password", function () {
                    const entry = this.general.createEntry("Once").setSingleUsePasswords(["only"]);
                    expect(entry.getProperty("password")).to.equal("only");
                    expect(entry.getProperty(QUEUE)).to.equal(undefined);
                    expect(entry.getSingleUsePasswords()).to.deep.equal(["only"]);
                });

                it("replaces an existing list, and keeps spaces in passwords", function () {
                    this.entry.setSingleUsePasswords([" a b ", "", "c"]);
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal([" a b ", "c"]);
                });

                it("rejects empty lists and line breaks", function () {
                    const entry = this.general.createEntry("Bad");
                    expect(() => entry.setSingleUsePasswords([])).to.throw(/No passwords/);
                    expect(() => entry.setSingleUsePasswords([""])).to.throw(/No passwords/);
                    expect(() => entry.setSingleUsePasswords(["a\nb"])).to.throw(/line break/);
                    expect(entry.hasSingleUsePasswords()).to.equal(false);
                    expect(entry.getProperty("password")).to.equal(undefined);
                });

                it("replaces a linked password with its own", function () {
                    const other = this.general.createEntry("Other").setProperty("password", "x");
                    const entry = this.general.createEntry("Linked").setProperty("password", "x");
                    entry.linkProperty("password", other);
                    entry.setSingleUsePasswords(["x", "y"]);
                    expect(entry.getPropertyLink("password")).to.equal(null);
                    other.setProperty("password", "changed");
                    expect(entry.getProperty("password")).to.equal("x");
                });

                it("aren't reported for normal entries", function () {
                    const entry = this.general.createEntry("Plain").setProperty("password", "p");
                    expect(entry.hasSingleUsePasswords()).to.equal(false);
                    expect(entry.getSingleUsePasswords()).to.equal(null);
                    expect(() => entry.popSingleUsePassword()).to.throw(/doesn't use/);
                });
            });

            describe("popSingleUsePassword", function () {
                it("moves the next password in", function () {
                    expect(this.entry.popSingleUsePassword()).to.equal("two");
                    expect(this.entry.getProperty("password")).to.equal("two");
                    expect(this.entry.getProperty(QUEUE)).to.equal("three");
                    expect(this.entry.popSingleUsePassword()).to.equal("three");
                    expect(this.entry.getProperty("password")).to.equal("three");
                    expect(this.entry.getProperty(QUEUE)).to.equal(undefined);
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal(["three"]);
                });

                it("leaves the password empty once all are used", function () {
                    this.entry.popSingleUsePassword();
                    this.entry.popSingleUsePassword();
                    expect(this.entry.popSingleUsePassword()).to.equal(null);
                    expect(this.entry.getProperty("password")).to.equal("");
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal([]);
                    expect(this.entry.hasSingleUsePasswords()).to.equal(true);
                    expect(this.entry.popSingleUsePassword()).to.equal(null);
                    this.entry.setSingleUsePasswords(["four"]);
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal(["four"]);
                });

                it("uses the queue when the password field was emptied", function () {
                    this.entry.setProperty("password", "");
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal(["two", "three"]);
                    expect(this.entry.popSingleUsePassword()).to.equal("two");
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal(["two", "three"]);
                });

                it("keeps used passwords in the entry's history", function () {
                    this.entry.popSingleUsePassword();
                    const values = this.entry
                        .getChanges()
                        .filter((change) => change.property === "password")
                        .map((change) => change.value);
                    expect(values).to.include("one");
                });

                it("follows queue edits made elsewhere", function () {
                    this.entry.setProperty(QUEUE, "\nfive\r\nsix\n");
                    expect(this.entry.popSingleUsePassword()).to.equal("five");
                    expect(this.entry.getProperty(QUEUE)).to.equal("six");
                });
            });

            describe("unsetSingleUsePasswords", function () {
                it("keeps the current password and drops the queue", function () {
                    this.entry.unsetSingleUsePasswords();
                    expect(this.entry.hasSingleUsePasswords()).to.equal(false);
                    expect(this.entry.getProperty("password")).to.equal("one");
                    expect(this.entry.getProperty(QUEUE)).to.equal(undefined);
                    expect(this.entry.getAttribute()).to.not.have.property(
                        Entry.Attributes.SingleUsePasswords
                    );
                });
            });

            describe("facades", function () {
                it("keep the passwords through an edit", function () {
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find((field) => field.property === "username").value = "janet";
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getSingleUsePasswords()).to.deep.equal([
                        "one",
                        "two",
                        "three"
                    ]);
                    expect(this.entry.popSingleUsePassword()).to.equal("two");
                });
            });
        });
    });

    describe("saving", function () {
        [
            ["Format A", VaultFormatA],
            ["Format B", VaultFormatB]
        ].forEach(([format, Format]) => {
            describe(`using ${format}`, function () {
                beforeEach(function () {
                    setDefaultFormat(Format);
                });

                afterEach(function () {
                    setDefaultFormat();
                });

                it("keeps the passwords when the vault is opened again", async function () {
                    const datasource = {
                        type: "memory",
                        property: `test:${Math.floor(Math.random() * 1000000)}`
                    };
                    const credsStr = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const source = new VaultSource("Single-use", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(source);
                    await source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    source.vault
                        .findGroupsByTitle("General")[0]
                        .createEntry("Bank")
                        .setSingleUsePasswords(["one", "two", "three"])
                        .popSingleUsePassword();
                    await source.save();
                    const credsStr2 = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Single-use again", "memory", credsStr2);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [entry] = reopened.vault.findEntriesByProperty("title", "Bank");
                    expect(entry.getSingleUsePasswords()).to.deep.equal(["two", "three"]);
                });
            });
        });
    });
});
