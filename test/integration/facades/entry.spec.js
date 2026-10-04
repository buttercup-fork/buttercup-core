import { expect } from "chai";
import {
    EntryPropertyValueType,
    Vault,
    VaultFormatA,
    VaultFormatB,
    consumeEntryFacade,
    createEntryFacade,
    getEntryPropertyValueType,
    setEntryFacadePropertyValueType,
    setEntryPropertyValueType
} from "../../../dist/node/index.js";

describe("Entry facades", function () {
    [
        [VaultFormatA, "A"],
        [VaultFormatB, "B"]
    ].forEach(([Format, formatName]) => {
        describe(`Format: ${formatName}`, function () {
            beforeEach(function () {
                this.vault = new Vault(Format);
                this.group = this.vault.createGroup("group");
                this.entry = this.group
                    .createEntry("Entry A")
                    .setProperty("username", "user@example.com")
                    .setProperty("password", "passw0rd")
                    .setAttribute("test_attr", "1234")
                    .setAttribute("test_attr_2", "5678");
                setEntryPropertyValueType(this.entry, "password", EntryPropertyValueType.Password);
                this.entryFacade = createEntryFacade(this.entry);
            });

            it("sets the correct value type when changing via property field", function () {
                setEntryFacadePropertyValueType(
                    this.entryFacade,
                    "password",
                    EntryPropertyValueType.Note
                );
                consumeEntryFacade(this.entry, this.entryFacade);
                expect(getEntryPropertyValueType(this.entry, "password")).to.equal(
                    EntryPropertyValueType.Note
                );
            });

            it("keeps a type changed on the property field only (buttercup-desktop#1218)", function () {
                this.entry.setProperty("pin", "1234");
                setEntryPropertyValueType(this.entry, "pin", EntryPropertyValueType.Note);
                const facade = createEntryFacade(this.entry);
                // Apps change the field's valueType and leave the type attribute field alone
                facade.fields.find((field) => field.property === "pin").valueType =
                    EntryPropertyValueType.Password;
                consumeEntryFacade(this.entry, facade);
                expect(getEntryPropertyValueType(this.entry, "pin")).to.equal(
                    EntryPropertyValueType.Password
                );
                expect(
                    createEntryFacade(this.entry).fields.find((field) => field.property === "pin")
                ).to.have.property("valueType", EntryPropertyValueType.Password);
            });

            it("drops the type of a renamed field", function () {
                this.entry.setProperty("pin", "1234");
                setEntryPropertyValueType(this.entry, "pin", EntryPropertyValueType.Note);
                const facade = createEntryFacade(this.entry);
                facade.fields.find((field) => field.property === "pin").property = "code";
                consumeEntryFacade(this.entry, facade);
                expect(this.entry.getProperty("code")).to.equal("1234");
                expect(this.entry.getProperty("pin")).to.be.undefined;
                expect(getEntryPropertyValueType(this.entry, "code")).to.equal(
                    EntryPropertyValueType.Note
                );
                expect(this.entry.getAttribute("BC_ENTRY_FIELD_TYPE:pin")).to.be.undefined;
            });

            it("drops the type of a deleted field, so a new field of that name starts as text", function () {
                this.entry.setProperty("pin", "1234");
                setEntryPropertyValueType(this.entry, "pin", EntryPropertyValueType.Password);
                const facade = createEntryFacade(this.entry);
                facade.fields = facade.fields.filter((field) => field.property !== "pin");
                consumeEntryFacade(this.entry, facade);
                expect(this.entry.getAttribute("BC_ENTRY_FIELD_TYPE:pin")).to.be.undefined;
                this.entry.setProperty("pin", "5678");
                expect(getEntryPropertyValueType(this.entry, "pin")).to.equal(
                    EntryPropertyValueType.Text
                );
            });

            it("removes type attributes left behind by fields that no longer exist", function () {
                this.entry.setAttribute("BC_ENTRY_FIELD_TYPE:gone", EntryPropertyValueType.Note);
                consumeEntryFacade(this.entry, createEntryFacade(this.entry));
                expect(this.entry.getAttribute("BC_ENTRY_FIELD_TYPE:gone")).to.be.undefined;
                expect(getEntryPropertyValueType(this.entry, "password")).to.equal(
                    EntryPropertyValueType.Password
                );
                expect(this.entry.getAttribute("test_attr")).to.equal("1234");
            });
        });
    });
});
