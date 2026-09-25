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

function facadeProperties(facade) {
    return facade.fields
        .filter((field) => field.propertyType === "property")
        .map((field) => field.property);
}

describe("Field ordering", function () {
    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([format, Format]) => {
        describe(`using ${format}`, function () {
            beforeEach(function () {
                this.vault = Vault.createWithDefaults(Format);
                this.entry = this.vault
                    .findGroupsByTitle("General")[0]
                    .createEntry("Login")
                    .setProperty("username", "jane")
                    .setProperty("password", "pass")
                    .setProperty("URL", "https://example.com")
                    .setProperty("E-Mail", "jane@example.com")
                    .setProperty("Test Note", "note");
            });

            describe("without orders", function () {
                it("lists properties in stored order", function () {
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                    expect(this.entry.getPropertyOrder("URL")).to.equal(Infinity);
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "title",
                        "username",
                        "password",
                        "URL",
                        "E-Mail",
                        "Test Note"
                    ]);
                });

                it("ignores unreadable order attributes", function () {
                    this.entry.setAttribute(`${Entry.Attributes.FieldOrderPrefix}URL`, "first");
                    this.entry.setAttribute(`${Entry.Attributes.FieldOrderPrefix}password`, "-1");
                    expect(this.entry.getPropertyOrder("URL")).to.equal(Infinity);
                    expect(this.entry.getPropertyOrder("password")).to.equal(Infinity);
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                });
            });

            describe("setPropertyOrder", function () {
                it("moves a property, shifting the ones after it", function () {
                    // The example from buttercup/buttercup-core#165
                    this.entry.setPropertyOrder("Test Note", 3);
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "title",
                        "username",
                        "password",
                        "Test Note",
                        "URL",
                        "E-Mail"
                    ]);
                    expect(
                        this.entry.getPropertyOrders().map((p) => this.entry.getPropertyOrder(p))
                    ).to.deep.equal([0, 1, 2, 3, 4, 5]);
                    this.entry.setPropertyOrder("username", Infinity);
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "title",
                        "password",
                        "Test Note",
                        "URL",
                        "E-Mail",
                        "username"
                    ]);
                    expect(this.entry.getPropertyOrder("username")).to.equal(5);
                });

                it("limits the position to the first and last places", function () {
                    this.entry.setPropertyOrder("title", 99);
                    expect(this.entry.getPropertyOrders()[5]).to.equal("title");
                    expect(this.entry.getPropertyOrder("title")).to.equal(5);
                    this.entry.setPropertyOrder("Test Note", -3);
                    expect(this.entry.getPropertyOrders()[0]).to.equal("Test Note");
                });

                it("moves forwards and backwards", function () {
                    this.entry.setPropertyOrder("title", 2);
                    expect(this.entry.getPropertyOrders().slice(0, 3)).to.deep.equal([
                        "username",
                        "password",
                        "title"
                    ]);
                    this.entry.setPropertyOrder("title", 0);
                    expect(this.entry.getPropertyOrders().slice(0, 3)).to.deep.equal([
                        "title",
                        "username",
                        "password"
                    ]);
                });

                it("puts properties added later at the end", function () {
                    this.entry.setPropertyOrder("URL", 0);
                    this.entry.setProperty("PIN", "1234");
                    expect(this.entry.getPropertyOrder("PIN")).to.equal(Infinity);
                    expect(this.entry.getPropertyOrders()[0]).to.equal("URL");
                    expect(this.entry.getPropertyOrders()[6]).to.equal("PIN");
                });

                it("rejects missing properties and invalid orders", function () {
                    expect(() => this.entry.setPropertyOrder("PIN", 0)).to.throw(
                        /No such property: PIN/
                    );
                    expect(() => this.entry.setPropertyOrder("URL", NaN)).to.throw(/Invalid order/);
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                });
            });

            describe("setPropertyOrders", function () {
                it("sets the whole order, with unlisted properties after", function () {
                    this.entry.setPropertyOrders(["Test Note", "E-Mail"]);
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "Test Note",
                        "E-Mail",
                        "title",
                        "username",
                        "password",
                        "URL"
                    ]);
                });

                it("rejects missing and repeated properties", function () {
                    expect(() => this.entry.setPropertyOrders(["URL", "PIN"])).to.throw(
                        /No such property: PIN/
                    );
                    expect(() => this.entry.setPropertyOrders(["URL", "URL"])).to.throw(
                        /listed twice: URL/
                    );
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                });
            });

            describe("removing orders", function () {
                it("deleteProperty removes the property's order", function () {
                    this.entry.setPropertyOrder("URL", 0);
                    this.entry.deleteProperty("URL");
                    expect(this.entry.getAttribute()).to.not.have.property(
                        `${Entry.Attributes.FieldOrderPrefix}URL`
                    );
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "title",
                        "username",
                        "password",
                        "E-Mail",
                        "Test Note"
                    ]);
                });

                it("resetPropertyOrders goes back to stored order", function () {
                    this.entry.setPropertyOrder("Test Note", 0);
                    this.entry.resetPropertyOrders();
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                    expect(
                        Object.keys(this.entry.getAttribute()).filter((key) =>
                            key.startsWith(Entry.Attributes.FieldOrderPrefix)
                        )
                    ).to.deep.equal([]);
                    expect(this.entry.getPropertyOrders()[0]).to.equal("title");
                });
            });

            describe("facades", function () {
                it("keep their usual field order when there are no orders", function () {
                    expect(facadeProperties(createEntryFacade(this.entry))).to.deep.equal([
                        "title",
                        "username",
                        "password",
                        "URL",
                        "E-Mail",
                        "Test Note"
                    ]);
                });

                it("list property fields in property order, attributes after", function () {
                    this.entry.setPropertyOrders(["Test Note", "password"]);
                    const facade = createEntryFacade(this.entry);
                    expect(facadeProperties(facade)).to.deep.equal([
                        "Test Note",
                        "password",
                        "title",
                        "username",
                        "URL",
                        "E-Mail"
                    ]);
                    const firstAttribute = facade.fields.findIndex(
                        (field) => field.propertyType === "attribute"
                    );
                    expect(
                        facade.fields
                            .slice(firstAttribute)
                            .every((field) => field.propertyType === "attribute")
                    ).to.equal(true);
                });

                it("don't write orders when the fields weren't moved", function () {
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find((field) => field.property === "username").value = "janet";
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getProperty("username")).to.equal("janet");
                    expect(this.entry.hasPropertyOrders()).to.equal(false);
                });

                it("save moved fields as the new order", function () {
                    const facade = createEntryFacade(this.entry);
                    const noteIndex = facade.fields.findIndex(
                        (field) => field.property === "Test Note"
                    );
                    const [note] = facade.fields.splice(noteIndex, 1);
                    facade.fields.unshift(note);
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "Test Note",
                        "title",
                        "username",
                        "password",
                        "URL",
                        "E-Mail"
                    ]);
                    expect(facadeProperties(createEntryFacade(this.entry))[0]).to.equal(
                        "Test Note"
                    );
                });

                it("keep the order through edits and added fields", function () {
                    this.entry.setPropertyOrder("URL", 0);
                    const facade = createEntryFacade(this.entry);
                    facade.fields.find((field) => field.property === "password").value = "new";
                    facade.fields.push({
                        ...facade.fields.find((field) => field.property === "Test Note"),
                        id: "new-field",
                        property: "PIN",
                        value: "1234"
                    });
                    consumeEntryFacade(this.entry, facade);
                    expect(this.entry.getProperty("password")).to.equal("new");
                    expect(this.entry.getPropertyOrders()).to.deep.equal([
                        "URL",
                        "title",
                        "username",
                        "password",
                        "E-Mail",
                        "Test Note",
                        "PIN"
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

                it("keeps the order when the vault is opened again", async function () {
                    const datasource = {
                        type: "memory",
                        property: `test:${Math.floor(Math.random() * 1000000)}`
                    };
                    const credsStr = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const source = new VaultSource("Order", "memory", credsStr);
                    await new VaultManager({ autoUpdate: false }).addSource(source);
                    await source.unlock(Credentials.fromPassword("test"), {
                        initialiseRemote: true
                    });
                    source.vault
                        .findGroupsByTitle("General")[0]
                        .createEntry("Login")
                        .setProperty("username", "jane")
                        .setProperty("password", "pass")
                        .setPropertyOrders(["password", "username"]);
                    await source.save();
                    const credsStr2 = await Credentials.fromDatasource(
                        datasource,
                        "test"
                    ).toSecureString();
                    const reopened = new VaultSource("Order again", "memory", credsStr2);
                    await new VaultManager({ autoUpdate: false }).addSource(reopened);
                    await reopened.unlock(Credentials.fromPassword("test"));
                    const [entry] = reopened.vault.findEntriesByProperty("title", "Login");
                    expect(entry.getPropertyOrders()).to.deep.equal([
                        "password",
                        "username",
                        "title"
                    ]);
                });
            });
        });
    });
});
