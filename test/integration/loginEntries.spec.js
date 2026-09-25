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

function titles(entries) {
    return entries.map((entry) => entry.getProperty("title"));
}

describe("Sign-in entries", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                this.general = this.vault.findGroupsByTitle("General")[0];
                this.google = this.general
                    .createEntry("Google")
                    .setProperty("username", "jane@gmail.com")
                    .setProperty("password", "g00gle");
                this.dnd = this.general
                    .createEntry("D&D Beyond")
                    .setProperty("URL", "https://www.dndbeyond.com")
                    .setLoginEntry(this.google);
            });

            describe("setLoginEntry", function () {
                it("links to the entry used to sign in", function () {
                    expect(this.dnd.getLoginEntry().id).to.equal(this.google.id);
                    expect(this.dnd.getLoginEntryLink()).to.deep.equal({
                        entryID: this.google.id,
                        title: "Google"
                    });
                    expect(this.dnd.isLoginEntryBroken()).to.equal(false);
                    expect(this.dnd.getAttribute(Entry.Attributes.LoginEntry)).to.equal(
                        `${this.google.id}:Google`
                    );
                });

                it("doesn't change either entry's fields", function () {
                    expect(this.dnd.getProperty("password")).to.equal(undefined);
                    expect(this.google.getLoginEntryLink()).to.equal(null);
                    expect(this.google.getProperty("password")).to.equal("g00gle");
                });

                it("replaces an earlier link, and can be removed", function () {
                    const apple = this.general.createEntry("Apple");
                    this.dnd.setLoginEntry(apple);
                    expect(this.dnd.getLoginEntry().id).to.equal(apple.id);
                    this.dnd.setLoginEntry(null);
                    expect(this.dnd.getLoginEntry()).to.equal(null);
                    expect(this.dnd.getLoginEntryLink()).to.equal(null);
                    expect(this.dnd.getAttribute()).to.not.have.property(
                        Entry.Attributes.LoginEntry
                    );
                });

                it("keeps titles containing colons", function () {
                    const work = this.general.createEntry("Work: SSO");
                    this.dnd.setLoginEntry(work);
                    expect(this.dnd.getLoginEntryLink().title).to.equal("Work: SSO");
                });

                it("rejects itself, loops, Trash and other vaults", function () {
                    expect(() => this.dnd.setLoginEntry(this.dnd)).to.throw(/itself/);
                    expect(() => this.google.setLoginEntry(this.dnd)).to.throw(/loop/);
                    const other = Vault.createWithDefaults(Format);
                    const stranger = other.findGroupsByTitle("General")[0].createEntry("X");
                    expect(() => this.dnd.setLoginEntry(stranger)).to.throw(/another vault/);
                    const old = this.general.createEntry("Old");
                    old.delete();
                    expect(() => this.dnd.setLoginEntry(old)).to.throw(/Trash/);
                    expect(this.dnd.getLoginEntry().id).to.equal(this.google.id);
                    expect(this.google.getLoginEntryLink()).to.equal(null);
                });

                it("allows chains that don't loop", function () {
                    const workspace = this.general.createEntry("Workspace");
                    this.google.setLoginEntry(workspace);
                    expect(this.dnd.getLoginEntry().id).to.equal(this.google.id);
                    expect(() => workspace.setLoginEntry(this.dnd)).to.throw(/loop/);
                });
            });

            describe("broken links", function () {
                it("when the entry is in Trash, keeping its title", function () {
                    this.google.delete();
                    expect(this.dnd.getLoginEntry()).to.equal(null);
                    expect(this.dnd.isLoginEntryBroken()).to.equal(true);
                    expect(this.dnd.getLoginEntryLink().title).to.equal("Google");
                });

                it("work again when the entry is restored", function () {
                    this.google.delete();
                    this.google.moveToGroup(this.general);
                    expect(this.dnd.isLoginEntryBroken()).to.equal(false);
                    expect(this.dnd.getLoginEntry().id).to.equal(this.google.id);
                });

                it("when the entry is permanently deleted", function () {
                    this.google.delete(true);
                    expect(this.dnd.isLoginEntryBroken()).to.equal(true);
                    expect(this.dnd.getLoginEntryLink().title).to.equal("Google");
                });

                it("aren't reported without a link", function () {
                    expect(this.google.isLoginEntryBroken()).to.equal(false);
                });

                it("ignore unreadable attributes", function () {
                    this.dnd.setAttribute(Entry.Attributes.LoginEntry, ":Google");
                    expect(this.dnd.getLoginEntryLink()).to.equal(null);
                    expect(this.dnd.isLoginEntryBroken()).to.equal(false);
                    this.dnd.setAttribute(Entry.Attributes.LoginEntry, "no-such-id");
                    expect(this.dnd.getLoginEntryLink()).to.deep.equal({
                        entryID: "no-such-id",
                        title: ""
                    });
                    expect(this.dnd.isLoginEntryBroken()).to.equal(true);
                });
            });

            describe("finding linking entries", function () {
                beforeEach(function () {
                    this.youtube = this.general.createEntry("YouTube").setProperty("password", "x");
                    this.youtube.linkProperty("password", this.google);
                    this.twitch = this.general.createEntry("Twitch").setLoginEntry(this.google);
                    this.general.createEntry("Unrelated").setProperty("password", "y");
                });

                it("findEntriesUsingLogin finds entries signing in with it", function () {
                    expect(titles(this.vault.findEntriesUsingLogin(this.google))).to.have.members([
                        "D&D Beyond",
                        "Twitch"
                    ]);
                    expect(this.vault.findEntriesUsingLogin(this.dnd)).to.deep.equal([]);
                });

                it("findEntriesLinkingTo also finds linked fields", function () {
                    expect(titles(this.vault.findEntriesLinkingTo(this.google))).to.have.members([
                        "D&D Beyond",
                        "Twitch",
                        "YouTube"
                    ]);
                });

                it("skip entries in Trash", function () {
                    this.twitch.delete();
                    this.youtube.delete();
                    expect(titles(this.vault.findEntriesUsingLogin(this.google))).to.deep.equal([
                        "D&D Beyond"
                    ]);
                    expect(titles(this.vault.findEntriesLinkingTo(this.google))).to.deep.equal([
                        "D&D Beyond"
                    ]);
                });
            });

            describe("facades", function () {
                it("keep the link through an edit", function () {
                    const facade = createEntryFacade(this.dnd);
                    facade.fields.find((f) => f.property === "URL").value = "https://dndbeyond.com";
                    consumeEntryFacade(this.dnd, facade);
                    expect(this.dnd.getLoginEntry().id).to.equal(this.google.id);
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
                beforeEach(async function () {
                    setDefaultFormat(Format);
                    this.datasource = {
                        type: "memory",
                        property: `test:${Math.floor(Math.random() * 1000000)}`
                    };
                    const credsStr = await Credentials.fromDatasource(
                        this.datasource,
                        "test"
                    ).toSecureString();
                    this.source = new VaultSource("Sign-in", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(this.source);
                    await this.source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    const general = this.source.vault.findGroupsByTitle("General")[0];
                    this.google = general.createEntry("Google");
                    this.dnd = general.createEntry("D&D Beyond").setLoginEntry(this.google);
                });

                afterEach(function () {
                    setDefaultFormat();
                });

                it("refreshes the stored title", async function () {
                    this.google.setProperty("title", "Google (personal)");
                    expect(this.dnd.getLoginEntryLink().title).to.equal("Google");
                    await this.source.save();
                    expect(this.dnd.getLoginEntryLink().title).to.equal("Google (personal)");
                });

                it("keeps the link when the vault is opened again", async function () {
                    await this.source.save();
                    const credsStr = await Credentials.fromDatasource(
                        this.datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Sign-in again", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [dnd] = reopened.vault.findEntriesByProperty("title", "D&D Beyond");
                    expect(dnd.getLoginEntry().getProperty("title")).to.equal("Google");
                });
            });
        });
    });
});
