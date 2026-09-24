import { expect } from "chai";
import {
    Credentials,
    Entry,
    EntryURLType,
    MemoryStorageInterface,
    Vault,
    VaultEntrySearch,
    VaultFormatA,
    VaultFormatB,
    VaultManager,
    VaultSource,
    consumeEntryFacade,
    createEntryFacade,
    setDefaultFormat
} from "../../dist/node/index.js";
import { generateVaultInsights } from "../../dist/node/insight/vault.js";

function storedValue(entry, property) {
    return entry.vault.format.getEntryProperties(entry._source)[property];
}

describe("Property links", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                const general = this.vault.findGroupsByTitle("General")[0];
                this.google = general
                    .createEntry("Google")
                    .setProperty("username", "jane@gmail.com")
                    .setProperty("password", "g00gle-pass")
                    .setProperty("url", "https://accounts.google.com");
                this.youtube = general
                    .createEntry("YouTube")
                    .setProperty("username", "jane-tube")
                    .setProperty("password", "old-yt-pass");
                this.youtube.linkProperty("password", this.google);
            });

            describe("linkProperty", function () {
                it("shows the linked value", function () {
                    expect(this.youtube.getProperty("password")).to.equal("g00gle-pass");
                    expect(this.youtube.getPropertyLink("password")).to.deep.equal({
                        entryID: this.google.id,
                        property: "password"
                    });
                });

                it("follows later changes to the linked value", function () {
                    this.google.setProperty("password", "new-g00gle-pass");
                    expect(this.youtube.getProperty("password")).to.equal("new-g00gle-pass");
                });

                it("stores a copy of the linked value", function () {
                    expect(storedValue(this.youtube, "password")).to.equal("g00gle-pass");
                });

                it("resolves links when reading all properties", function () {
                    expect(this.youtube.getProperty()).to.include({
                        username: "jane-tube",
                        password: "g00gle-pass"
                    });
                    expect(this.youtube.getProperties(/^pass/)).to.deep.equal({
                        password: "g00gle-pass"
                    });
                });

                it("links to a differently named property, creating it", function () {
                    this.youtube.linkProperty("Google login", this.google, "username");
                    this.youtube.linkProperty("Login URL", this.google, "url");
                    expect(this.youtube.getProperty("Google login")).to.equal("jane@gmail.com");
                    expect(this.youtube.getURLs(EntryURLType.Login)).to.include(
                        "https://accounts.google.com"
                    );
                });

                it("follows chains of links", function () {
                    const music = this.youtube
                        .getGroup()
                        .createEntry("YouTube Music")
                        .setProperty("password", "x");
                    music.linkProperty("password", this.youtube);
                    this.google.setProperty("password", "chained");
                    expect(music.getProperty("password")).to.equal("chained");
                });

                it("does not change the linked entry", function () {
                    expect(this.google.getPropertyLink("password")).to.equal(null);
                    expect(this.google.getProperty("password")).to.equal("g00gle-pass");
                });

                it("rejects links that would create a loop", function () {
                    expect(() => this.google.linkProperty("password", this.youtube)).to.throw(
                        /loop/
                    );
                    expect(() => this.google.linkProperty("password", this.google)).to.throw(
                        /loop/
                    );
                    expect(this.google.getPropertyLink("password")).to.equal(null);
                });

                it("rejects missing properties, Trash and other vaults", function () {
                    expect(() => this.youtube.linkProperty("pin", this.google)).to.throw(
                        /no property: pin/
                    );
                    const other = Vault.createWithDefaults(Format);
                    const stranger = other.findGroupsByTitle("General")[0].createEntry("X");
                    stranger.setProperty("password", "p");
                    expect(() => this.youtube.linkProperty("password", stranger)).to.throw(
                        /another vault/
                    );
                    this.google.delete();
                    const bing = this.youtube.getGroup().createEntry("Bing");
                    expect(() => bing.linkProperty("password", this.google)).to.throw(/Trash/);
                });
            });

            describe("editing", function () {
                it("setProperty replaces the link with its own value", function () {
                    this.youtube.setProperty("password", "own-pass");
                    expect(this.youtube.getPropertyLink("password")).to.equal(null);
                    expect(this.youtube.getProperty("password")).to.equal("own-pass");
                    expect(this.google.getProperty("password")).to.equal("g00gle-pass");
                });

                it("unlinkProperty keeps the linked value by default", function () {
                    this.google.setProperty("password", "latest");
                    this.youtube.unlinkProperty("password");
                    expect(this.youtube.getPropertyLink("password")).to.equal(null);
                    expect(this.youtube.getProperty("password")).to.equal("latest");
                    this.google.setProperty("password", "later");
                    expect(this.youtube.getProperty("password")).to.equal("latest");
                });

                it("unlinkProperty can remove the property", function () {
                    this.youtube.unlinkProperty("password", { keepValue: false });
                    expect(this.youtube.getProperty("password")).to.equal(undefined);
                    expect(this.youtube.getAttribute()).to.not.have.property(
                        `${Entry.Attributes.PropertyLinkPrefix}password`
                    );
                });

                it("deleteProperty removes the link", function () {
                    this.youtube.deleteProperty("password");
                    expect(this.youtube.getPropertyLink("password")).to.equal(null);
                });
            });

            describe("broken links", function () {
                it("fall back to the stored copy when the entry is in Trash", function () {
                    this.google.delete();
                    expect(this.youtube.isPropertyLinkBroken("password")).to.equal(true);
                    expect(this.youtube.getProperty("password")).to.equal("g00gle-pass");
                });

                it("work again when the entry is restored from Trash", function () {
                    this.google.delete();
                    this.google.moveToGroup(this.youtube.getGroup());
                    expect(this.youtube.isPropertyLinkBroken("password")).to.equal(false);
                });

                it("fall back when the entry is permanently deleted", function () {
                    this.google.delete(true);
                    expect(this.youtube.isPropertyLinkBroken("password")).to.equal(true);
                    expect(this.youtube.getProperty("password")).to.equal("g00gle-pass");
                });

                it("fall back when the linked property is deleted", function () {
                    this.google.deleteProperty("password");
                    expect(this.youtube.isPropertyLinkBroken("password")).to.equal(true);
                    expect(this.youtube.getProperty("password")).to.equal("g00gle-pass");
                });

                it("stop a chain at the last entry still in sync", function () {
                    const music = this.youtube.getGroup().createEntry("YouTube Music");
                    music.setProperty("password", "x").linkProperty("password", this.youtube);
                    this.google.delete(true);
                    expect(music.isPropertyLinkBroken("password")).to.equal(false);
                    expect(music.getProperty("password")).to.equal("g00gle-pass");
                });

                it("aren't reported for unlinked properties", function () {
                    expect(this.google.isPropertyLinkBroken("password")).to.equal(false);
                });
            });

            describe("facades", function () {
                it("show the linked value", function () {
                    const facade = createEntryFacade(this.youtube);
                    const field = facade.fields.find(
                        (f) => f.propertyType === "property" && f.property === "password"
                    );
                    expect(field.value).to.equal("g00gle-pass");
                });

                it("keep the link when the linked field is unchanged", function () {
                    const facade = createEntryFacade(this.youtube);
                    facade.fields.find((f) => f.property === "username").value = "jane-tube-2";
                    consumeEntryFacade(this.youtube, facade);
                    expect(this.youtube.getPropertyLink("password")).to.not.equal(null);
                    this.google.setProperty("password", "changed");
                    expect(this.youtube.getProperty("password")).to.equal("changed");
                });

                it("replace the link when the linked field is edited", function () {
                    const facade = createEntryFacade(this.youtube);
                    facade.fields.find(
                        (f) => f.propertyType === "property" && f.property === "password"
                    ).value = "own-pass";
                    consumeEntryFacade(this.youtube, facade);
                    expect(this.youtube.getPropertyLink("password")).to.equal(null);
                    expect(this.youtube.getProperty("password")).to.equal("own-pass");
                    expect(this.google.getProperty("password")).to.equal("g00gle-pass");
                });
            });

            it("are searched by their linked values", async function () {
                this.youtube.linkProperty("username", this.google);
                const search = new VaultEntrySearch([this.vault], new MemoryStorageInterface());
                await search.prepare();
                const titles = search
                    .searchByTerm("jane@gmail.com")
                    .map((result) => result.properties.title);
                expect(titles).to.include("YouTube");
            });

            it("aren't counted as reused passwords", function () {
                expect(generateVaultInsights(this.vault).duplicatePasswords).to.equal(0);
                this.youtube.setProperty("password", "g00gle-pass");
                expect(generateVaultInsights(this.vault).duplicatePasswords).to.equal(2);
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
                    this.source = new VaultSource("Links", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(this.source);
                    await this.source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    const general = this.source.vault.findGroupsByTitle("General")[0];
                    this.google = general.createEntry("Google").setProperty("password", "one");
                    this.youtube = general.createEntry("YouTube").setProperty("password", "x");
                    this.youtube.linkProperty("password", this.google);
                });

                afterEach(function () {
                    setDefaultFormat();
                });

                it("refreshes stored copies of linked values", async function () {
                    this.google.setProperty("password", "two");
                    expect(storedValue(this.youtube, "password")).to.equal("one");
                    await this.source.save();
                    expect(storedValue(this.youtube, "password")).to.equal("two");
                });

                it("keeps links when the vault is opened again", async function () {
                    await this.source.save();
                    const credsStr = await Credentials.fromDatasource(
                        this.datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Links again", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [google] = reopened.vault.findEntriesByProperty("title", "Google");
                    const [youtube] = reopened.vault.findEntriesByProperty("title", "YouTube");
                    google.setProperty("password", "three");
                    expect(youtube.getProperty("password")).to.equal("three");
                });
            });
        });
    });
});
