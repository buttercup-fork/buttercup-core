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

const MARKER = `${Entry.Attributes.RecoveryCodesPrefix}Recovery codes`;

function summary(entry) {
    return entry
        .getRecoveryCodes("Recovery codes")
        .map(({ code, used }) => (used ? `${code} (used)` : code));
}

describe("Recovery codes", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                this.entry = this.vault
                    .findGroupsByTitle("General")[0]
                    .createEntry("GitHub")
                    .setProperty("password", "gh-pass")
                    .setRecoveryCodes("Recovery codes", ["aaaa-1111", "bbbb-2222", "cccc-3333"]);
            });

            describe("setRecoveryCodes", function () {
                it("stores the codes one per line, as a password field", function () {
                    expect(this.entry.getProperty("Recovery codes")).to.equal(
                        "aaaa-1111\nbbbb-2222\ncccc-3333"
                    );
                    expect(this.entry.getPropertyValueType("Recovery codes")).to.equal(
                        EntryPropertyValueType.Password
                    );
                    expect(this.entry.isRecoveryCodesProperty("Recovery codes")).to.equal(true);
                    expect(summary(this.entry)).to.deep.equal([
                        "aaaa-1111",
                        "bbbb-2222",
                        "cccc-3333"
                    ]);
                });

                it("converts an existing field, dropping blank lines and whitespace", function () {
                    this.entry.setProperty(
                        "Backup codes",
                        "  one two three \r\n\r\nfour five six\n"
                    );
                    this.entry.setRecoveryCodes("Backup codes");
                    expect(this.entry.getProperty("Backup codes")).to.equal(
                        "one two three\nfour five six"
                    );
                    expect(
                        this.entry.getRecoveryCodes("Backup codes").map((item) => item.code)
                    ).to.deep.equal(["one two three", "four five six"]);
                });

                it("keeps used codes that are still in a new list", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    this.entry.markRecoveryCodeUsed("Recovery codes", "bbbb-2222");
                    this.entry.setRecoveryCodes("Recovery codes", ["bbbb-2222", "dddd-4444"]);
                    expect(summary(this.entry)).to.deep.equal(["bbbb-2222 (used)", "dddd-4444"]);
                    expect(this.entry.getAttribute(MARKER)).to.equal('["bbbb-2222"]');
                });

                it("rejects empty lists and codes with line breaks", function () {
                    expect(() => this.entry.setRecoveryCodes("Other", [])).to.throw(/No codes/);
                    expect(() => this.entry.setRecoveryCodes("Other", ["  ", ""])).to.throw(
                        /No codes/
                    );
                    expect(() => this.entry.setRecoveryCodes("Other")).to.throw(/No codes/);
                    expect(() => this.entry.setRecoveryCodes("Other", ["a\nb"])).to.throw(
                        /line break/
                    );
                    expect(this.entry.getProperty("Other")).to.equal(undefined);
                });

                it("doesn't add history when converting an unchanged field", function () {
                    this.entry.setProperty("Backup codes", "x1\nx2");
                    const changes = this.entry.getChanges().length;
                    this.entry.setRecoveryCodes("Backup codes");
                    expect(this.entry.getChanges()).to.have.lengthOf(changes);
                });
            });

            describe("markRecoveryCodeUsed", function () {
                it("marks a code as used, and unused again", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "bbbb-2222");
                    expect(summary(this.entry)).to.deep.equal([
                        "aaaa-1111",
                        "bbbb-2222 (used)",
                        "cccc-3333"
                    ]);
                    this.entry.markRecoveryCodeUsed("Recovery codes", " bbbb-2222 ", false);
                    expect(summary(this.entry)).to.deep.equal([
                        "aaaa-1111",
                        "bbbb-2222",
                        "cccc-3333"
                    ]);
                });

                it("throws for unknown codes and other fields", function () {
                    expect(() =>
                        this.entry.markRecoveryCodeUsed("Recovery codes", "zzzz-9999")
                    ).to.throw(/Code not found/);
                    expect(() => this.entry.markRecoveryCodeUsed("password", "gh-pass")).to.throw(
                        /Not a recovery codes property/
                    );
                });

                it("doesn't change the field's value or history", function () {
                    const changes = this.entry.getChanges().length;
                    this.entry.markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    expect(this.entry.getProperty("Recovery codes")).to.equal(
                        "aaaa-1111\nbbbb-2222\ncccc-3333"
                    );
                    expect(this.entry.getChanges()).to.have.lengthOf(changes);
                });
            });

            describe("editing", function () {
                it("keeps used state for codes still present after setProperty", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    this.entry.setProperty("Recovery codes", "aaaa-1111\neeee-5555");
                    expect(summary(this.entry)).to.deep.equal(["aaaa-1111 (used)", "eeee-5555"]);
                });

                it("stops being recovery codes when no longer a password field", function () {
                    this.entry.setPropertyValueType("Recovery codes", EntryPropertyValueType.Text);
                    expect(this.entry.isRecoveryCodesProperty("Recovery codes")).to.equal(false);
                    expect(this.entry.getRecoveryCodes("Recovery codes")).to.equal(null);
                });

                it("deleteProperty removes the used codes attribute", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    this.entry.deleteProperty("Recovery codes");
                    expect(this.entry.getAttribute(MARKER)).to.equal(undefined);
                    expect(this.entry.isRecoveryCodesProperty("Recovery codes")).to.equal(false);
                });

                it("unsetRecoveryCodes leaves a plain password field", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    this.entry.unsetRecoveryCodes("Recovery codes");
                    expect(this.entry.getRecoveryCodes("Recovery codes")).to.equal(null);
                    expect(this.entry.getAttribute(MARKER)).to.equal(undefined);
                    expect(this.entry.getPropertyValueType("Recovery codes")).to.equal(
                        EntryPropertyValueType.Password
                    );
                    expect(this.entry.getProperty("Recovery codes")).to.equal(
                        "aaaa-1111\nbbbb-2222\ncccc-3333"
                    );
                });

                it("treats an unreadable used codes attribute as none used", function () {
                    this.entry.setAttribute(MARKER, "not json");
                    expect(summary(this.entry)).to.deep.equal([
                        "aaaa-1111",
                        "bbbb-2222",
                        "cccc-3333"
                    ]);
                    this.entry.markRecoveryCodeUsed("Recovery codes", "cccc-3333");
                    expect(this.entry.getAttribute(MARKER)).to.equal('["cccc-3333"]');
                });

                it("aren't reported for plain fields", function () {
                    expect(this.entry.isRecoveryCodesProperty("password")).to.equal(false);
                    expect(this.entry.getRecoveryCodes("password")).to.equal(null);
                    expect(this.entry.getRecoveryCodes("missing")).to.equal(null);
                });
            });

            describe("facades", function () {
                it("show the codes as a password field", function () {
                    const field = createEntryFacade(this.entry).fields.find(
                        (f) => f.propertyType === "property" && f.property === "Recovery codes"
                    );
                    expect(field.valueType).to.equal(EntryPropertyValueType.Password);
                    expect(field.value).to.equal("aaaa-1111\nbbbb-2222\ncccc-3333");
                });

                it("keep used codes through an edit", function () {
                    this.entry.markRecoveryCodeUsed("Recovery codes", "bbbb-2222");
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find((f) => f.property === "password").value = "new-pass";
                    consumeEntryFacade(this.entry, facade);
                    expect(summary(this.entry)).to.deep.equal([
                        "aaaa-1111",
                        "bbbb-2222 (used)",
                        "cccc-3333"
                    ]);
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

                it("keeps codes and used state when the vault is opened again", async function () {
                    const datasource = {
                        type: "memory",
                        property: `test:${Math.floor(Math.random() * 1000000)}`
                    };
                    const credsStr = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const source = new VaultSource("Codes", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(source);
                    await source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    source.vault
                        .findGroupsByTitle("General")[0]
                        .createEntry("GitHub")
                        .setRecoveryCodes("Recovery codes", ["aaaa-1111", "bbbb-2222"])
                        .markRecoveryCodeUsed("Recovery codes", "aaaa-1111");
                    await source.save();
                    const credsStr2 = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Codes again", "memory", credsStr2);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [entry] = reopened.vault.findEntriesByProperty("title", "GitHub");
                    expect(summary(entry)).to.deep.equal(["aaaa-1111 (used)", "bbbb-2222"]);
                });
            });
        });
    });
});
