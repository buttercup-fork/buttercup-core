import { expect } from "chai";
import {
    Credentials,
    Entry,
    Vault,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    consumeEntryFacade,
    createEntryFacade,
    setDefaultFormat
} from "../../dist/node/index.js";
import { generateVaultInsights } from "../../dist/node/insight/vault.js";

const DAY = 24 * 60 * 60 * 1000;
const CHANGED = Entry.Attributes.PasswordChanged;

function setChanged(entry, time) {
    entry.setAttribute(CHANGED, `${time}`);
}

describe("Password expiry", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                this.general = this.vault.findGroupsByTitle("General")[0];
                this.entry = this.general
                    .createEntry("Work")
                    .setProperty("username", "jane")
                    .setProperty("password", "first-pass");
                this.start = Date.now() - 100 * DAY;
                setChanged(this.entry, this.start);
            });

            describe("password change time", function () {
                it("is recorded when the password is set", function () {
                    const entry = this.general.createEntry("New");
                    expect(entry.getPasswordChangedTime()).to.equal(null);
                    const before = Date.now();
                    entry.setProperty("password", "abc");
                    const changed = entry.getPasswordChangedTime();
                    expect(changed).to.be.within(before, Date.now());
                });

                it("isn't updated when the password stays the same", function () {
                    this.entry.setProperty("password", "first-pass");
                    expect(this.entry.getPasswordChangedTime()).to.equal(this.start);
                });

                it("isn't recorded for other properties", function () {
                    this.entry.setProperty("username", "janet");
                    this.entry.setProperty("Password hint", "pets");
                    expect(this.entry.getPasswordChangedTime()).to.equal(this.start);
                });

                it("follows a linked password", function () {
                    const linked = this.general.createEntry("Linked").setProperty("password", "x");
                    linked.linkProperty("password", this.entry);
                    expect(linked.getPasswordChangedTime()).to.equal(this.start);
                    this.entry.setProperty("password", "second-pass");
                    expect(linked.getPasswordChangedTime()).to.be.above(this.start);
                });

                it("falls back to its own time when the link is broken", function () {
                    const linked = this.general.createEntry("Linked").setProperty("password", "x");
                    linked.linkProperty("password", this.entry);
                    setChanged(linked, this.start + DAY);
                    this.entry.delete();
                    expect(linked.getPasswordChangedTime()).to.equal(this.start + DAY);
                });
            });

            describe("setPasswordExpiry", function () {
                it("expires the password the given days after its last change", function () {
                    this.entry.setPasswordExpiry(90);
                    expect(this.entry.getPasswordExpiry()).to.equal(90);
                    expect(this.entry.getPasswordExpiryTime()).to.equal(this.start + 90 * DAY);
                    expect(this.entry.hasExpiredPassword()).to.equal(true);
                    expect(this.entry.hasExpiredPassword(this.start + 89 * DAY)).to.equal(false);
                    expect(this.entry.hasExpiredPassword(this.start + 90 * DAY)).to.equal(true);
                });

                it("starts again when the password is changed", function () {
                    this.entry.setPasswordExpiry(90);
                    this.entry.setProperty("password", "second-pass");
                    expect(this.entry.hasExpiredPassword()).to.equal(false);
                    expect(this.entry.hasExpiredPassword(Date.now() + 91 * DAY)).to.equal(true);
                });

                it("starts now when the last change isn't known", function () {
                    this.entry.deleteAttribute(CHANGED);
                    expect(this.entry.getPasswordChangedTime()).to.equal(null);
                    const before = Date.now();
                    this.entry.setPasswordExpiry(30);
                    expect(this.entry.getPasswordChangedTime()).to.be.within(before, Date.now());
                    expect(this.entry.hasExpiredPassword()).to.equal(false);
                });

                it("can be removed", function () {
                    this.entry.setPasswordExpiry(90);
                    this.entry.setPasswordExpiry(null);
                    expect(this.entry.getPasswordExpiry()).to.equal(null);
                    expect(this.entry.getPasswordExpiryTime()).to.equal(null);
                    expect(this.entry.hasExpiredPassword()).to.equal(false);
                    expect(this.entry.getAttribute()).to.not.have.property(
                        Entry.Attributes.PasswordExpiry
                    );
                });

                it("rejects invalid periods", function () {
                    [0, -5, 1.5, NaN, Infinity, "30"].forEach((days) => {
                        expect(() => this.entry.setPasswordExpiry(days)).to.throw(
                            /Invalid number of days/
                        );
                    });
                    expect(this.entry.getPasswordExpiry()).to.equal(null);
                });

                it("ignores unreadable attributes", function () {
                    this.entry.setAttribute(Entry.Attributes.PasswordExpiry, "soon");
                    expect(this.entry.getPasswordExpiry()).to.equal(null);
                    this.entry.setPasswordExpiry(10);
                    this.entry.setAttribute(CHANGED, "yesterday");
                    expect(this.entry.getPasswordChangedTime()).to.equal(null);
                    expect(this.entry.hasExpiredPassword()).to.equal(false);
                });

                it("doesn't expire passwords without a period", function () {
                    expect(this.entry.hasExpiredPassword(Date.now() + 1000 * DAY)).to.equal(false);
                });
            });

            describe("Vault#findEntriesByExpiredPassword", function () {
                beforeEach(function () {
                    this.entry.setPasswordExpiry(90);
                    this.soon = this.general
                        .createEntry("Soon")
                        .setProperty("password", "p")
                        .setPasswordExpiry(30);
                    setChanged(this.soon, Date.now() - 25 * DAY);
                    this.general.createEntry("Never").setProperty("password", "p");
                });

                it("finds expired passwords", function () {
                    expect(
                        this.vault.findEntriesByExpiredPassword().map((e) => e.getProperty("title"))
                    ).to.deep.equal(["Work"]);
                });

                it("finds passwords expiring by a later time", function () {
                    expect(
                        this.vault
                            .findEntriesByExpiredPassword(Date.now() + 7 * DAY)
                            .map((e) => e.getProperty("title"))
                    ).to.have.members(["Work", "Soon"]);
                });

                it("skips entries in Trash", function () {
                    this.entry.delete();
                    expect(this.vault.findEntriesByExpiredPassword()).to.deep.equal([]);
                });

                it("are counted in vault insights", function () {
                    expect(generateVaultInsights(this.vault).expiredPasswords).to.equal(1);
                    this.soon.setProperty("password", "p2");
                    this.entry.delete();
                    expect(generateVaultInsights(this.vault).expiredPasswords).to.equal(0);
                });
            });

            describe("facades", function () {
                it("record a password change made through a facade", function () {
                    this.entry.setPasswordExpiry(90);
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find(
                        (f) => f.propertyType === "property" && f.property === "password"
                    ).value = "second-pass";
                    const before = Date.now();
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getPasswordChangedTime()).to.be.within(before, Date.now());
                    expect(this.entry.hasExpiredPassword()).to.equal(false);
                });

                it("keep the change time and period through other edits", function () {
                    this.entry.setPasswordExpiry(90);
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find((f) => f.property === "username").value = "janet";
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getPasswordChangedTime()).to.equal(this.start);
                    expect(this.entry.getPasswordExpiry()).to.equal(90);
                });

                it("can set the period as an attribute field", function () {
                    const facade = createEntryFacade(this.entry);
                    facade.fields.push({
                        ...facade.fields.find((f) => f.propertyType === "attribute"),
                        id: "expiry",
                        property: Entry.Attributes.PasswordExpiry,
                        value: "30"
                    });
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getPasswordExpiry()).to.equal(30);
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

                it("keeps the expiry when the vault is opened again", async function () {
                    const datasource = {
                        type: "memory",
                        property: `test:${Math.floor(Math.random() * 1000000)}`
                    };
                    const credsStr = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const source = new VaultSource("Expiry", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(source);
                    await source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    const entry = source.vault
                        .findGroupsByTitle("General")[0]
                        .createEntry("Work")
                        .setProperty("password", "p")
                        .setPasswordExpiry(60);
                    const changed = entry.getPasswordChangedTime();
                    await source.save();
                    const credsStr2 = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Expiry again", "memory", credsStr2);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [found] = reopened.vault.findEntriesByProperty("title", "Work");
                    expect(found.getPasswordExpiry()).to.equal(60);
                    expect(found.getPasswordExpiryTime()).to.equal(changed + 60 * DAY);
                });
            });
        });
    });
});
