import { expect } from "chai";
import {
    ErrorCode,
    Vault,
    VaultFormatA,
    VaultFormatB,
    getErrorCode
} from "../../dist/node/index.js";

// Names that exist on every plain object through Object.prototype. Field and
// attribute names are user-controlled (custom fields, imports), so a vault must
// treat them like any other name.
const INHERITED_NAMES = ["constructor", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"];

function expectInvalidName(fn) {
    let error = null;
    try {
        fn();
    } catch (err) {
        error = err;
    }
    expect(error, "expected an error").to.be.an.instanceOf(Error);
    expect(getErrorCode(error)).to.equal(ErrorCode.InvalidPropertyName);
}

[
    ["Format A", VaultFormatA],
    ["Format B", VaultFormatB]
].forEach(([formatName, Format]) => {
    describe(`${formatName}: names inherited from Object.prototype`, function () {
        beforeEach(function () {
            this.vault = Vault.createWithDefaults(Format);
            this.group = this.vault.getGroups()[0];
            this.entry = this.group.createEntry("Test");
        });

        INHERITED_NAMES.forEach((name) => {
            describe(`"${name}"`, function () {
                it("reads as unset before being set", function () {
                    expect(this.entry.getProperty(name)).to.be.undefined;
                    expect(this.entry.getAttribute(name)).to.be.undefined;
                    expect(this.group.getAttribute(name)).to.be.undefined;
                    expect(this.vault.getAttribute(name)).to.be.undefined;
                });

                it("can be set and changed as an entry property", function () {
                    this.entry.setProperty(name, "one");
                    expect(this.entry.getProperty(name)).to.equal("one");
                    this.entry.setProperty(name, "two");
                    expect(this.entry.getProperty(name)).to.equal("two");
                    expect(this.entry.getProperty()).to.have.property(name, "two");
                });

                it("can be set and changed as an entry attribute", function () {
                    this.entry.setAttribute(name, "one");
                    this.entry.setAttribute(name, "two");
                    expect(this.entry.getAttribute(name)).to.equal("two");
                });

                it("can be set and changed as a group attribute", function () {
                    this.group.setAttribute(name, "one");
                    this.group.setAttribute(name, "two");
                    expect(this.group.getAttribute(name)).to.equal("two");
                });

                it("can be set and changed as a vault attribute", function () {
                    this.vault.setAttribute(name, "one");
                    this.vault.setAttribute(name, "two");
                    expect(this.vault.getAttribute(name)).to.equal("two");
                });

                it("can be deleted once set", function () {
                    this.entry.setProperty(name, "value");
                    this.entry.setAttribute(name, "value");
                    this.group.setAttribute(name, "value");
                    this.vault.setAttribute(name, "value");
                    this.entry.deleteProperty(name);
                    this.entry.deleteAttribute(name);
                    this.group.deleteAttribute(name);
                    this.vault.deleteAttribute(name);
                    expect(this.entry.getProperty(name)).to.be.undefined;
                    expect(this.entry.getAttribute(name)).to.be.undefined;
                    expect(this.group.getAttribute(name)).to.be.undefined;
                    expect(this.vault.getAttribute(name)).to.be.undefined;
                });

                it("survives a history round trip", function () {
                    this.entry.setProperty(name, "prop");
                    this.entry.setAttribute(name, "attr");
                    const copy = Vault.createFromHistory(this.vault.format.getHistory(), Format);
                    const entry = copy.findEntryByID(this.entry.id);
                    expect(entry.getProperty(name)).to.equal("prop");
                    expect(entry.getAttribute(name)).to.equal("attr");
                });
            });
        });

        describe(`"__proto__"`, function () {
            it("is rejected as an entry property", function () {
                expectInvalidName(() => this.entry.setProperty("__proto__", "x"));
            });

            it("is rejected as an entry attribute", function () {
                expectInvalidName(() => this.entry.setAttribute("__proto__", "x"));
            });

            it("is rejected as a group attribute", function () {
                expectInvalidName(() => this.group.setAttribute("__proto__", "x"));
            });

            it("is rejected as a vault attribute", function () {
                expectInvalidName(() => this.vault.setAttribute("__proto__", "x"));
            });

            it("still lets a vault that already contains it open", function () {
                this.entry.setProperty("placeholdername", "x");
                // Format A stores names base64-encoded, Format B as plain JSON
                const encoded = (name) => Buffer.from(name).toString("base64");
                const history = this.vault.format
                    .getHistory()
                    .map((line) =>
                        line
                            .split(encoded("placeholdername"))
                            .join(encoded("__proto__"))
                            .split("placeholdername")
                            .join("__proto__")
                    );
                expect(history.join(" ")).to.match(new RegExp(`__proto__|${encoded("__proto__")}`));
                const copy = Vault.createFromHistory(history, Format);
                const entry = copy.findEntryByID(this.entry.id);
                expect(entry).to.not.be.null;
                expect(entry.getProperty("__proto__")).to.not.equal("x");
                entry.setProperty("username", "me");
                expect(entry.getProperty("username")).to.equal("me");
                expect({}.x).to.be.undefined;
            });

            it("leaves the vault usable and Object.prototype untouched", function () {
                try {
                    this.entry.setProperty("__proto__", "x");
                } catch (err) {}
                this.entry.setProperty("username", "me");
                expect(this.entry.getProperty("username")).to.equal("me");
                expect({}.x).to.be.undefined;
            });
        });
    });
});

// Merge the way VaultSource does: move the merged format into a vault.
function merge(base, incoming) {
    const vault = Vault.createFromHistory(base, VaultFormatB);
    vault._updateFormat(VaultFormatB.vaultFromMergedHistories(base, incoming).format);
    return vault;
}

describe("Format B: merging and comparing inherited names", function () {
    beforeEach(function () {
        this.vault = Vault.createWithDefaults(VaultFormatB);
        this.entry = this.vault.getGroups()[0].createEntry("Test");
        this.entry.setProperty("username", "me");
    });

    it("merges a name that only one side has", function () {
        const base = this.vault.format.getHistory();
        this.entry.setProperty("toString", "incoming");
        this.entry.setAttribute("constructor", "incoming");
        const incoming = this.vault.format.getHistory();
        const entry = merge(base, incoming).findEntryByID(this.entry.id);
        expect(entry.getProperty("toString")).to.equal("incoming");
        expect(entry.getAttribute("constructor")).to.equal("incoming");
        expect(entry.getProperty("username")).to.equal("me");
    });

    it("merges a name that both sides changed", function () {
        this.entry.setProperty("toString", "base");
        const base = this.vault.format.getHistory();
        const incomingVault = Vault.createFromHistory(base, VaultFormatB);
        incomingVault.findEntryByID(this.entry.id).setProperty("toString", "incoming");
        const merged = merge(base, incomingVault.format.getHistory());
        expect(["base", "incoming"]).to.include(
            merged.findEntryByID(this.entry.id).getProperty("toString")
        );
    });

    it("sees a vault differ when only an inherited name was added", function () {
        const before = this.vault.format.getHistory();
        this.entry.setProperty("valueOf", "added");
        expect(VaultFormatB.historiesDiffer(before, this.vault.format.getHistory())).to.be.true;
    });
});
