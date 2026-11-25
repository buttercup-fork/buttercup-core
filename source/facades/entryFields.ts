import { createFieldDescriptor } from "./tools.js";
import { Entry } from "../core/Entry.js";
import {
    EntryFacadeField,
    EntryPropertyType,
    EntryPropertyValueType,
    EntryType
} from "../types.js";

const DIGIT = "\\d";

function createBaseFields(entry: Entry | null): Array<EntryFacadeField> {
    return [createFieldDescriptor(entry, "Title", EntryPropertyType.Property, "title")];
}

function createCreditCardFields(entry: Entry | null): Array<EntryFacadeField> {
    return [
        ...createBaseFields(entry),
        createFieldDescriptor(entry, "Card Holder", EntryPropertyType.Property, "username"),
        // Hidden like the CVV (B-715). Up to 19 digits in groups of 4, so
        // 14, 15 and 19-digit cards fit; a formatter stops at the end of its
        // format, so 4-4-4-4 cut longer numbers off at 16 digits (B-716)
        createFieldDescriptor(entry, "Card Number", EntryPropertyType.Property, "password", {
            formatting: {
                format: [
                    { char: DIGIT, repeat: 4 },
                    { exactly: "-" },
                    { char: DIGIT, repeat: 4 },
                    { exactly: "-" },
                    { char: DIGIT, repeat: 4 },
                    { exactly: "-" },
                    { char: DIGIT, repeat: 4 },
                    { exactly: "-" },
                    { char: DIGIT, repeat: 3 }
                ],
                placeholder: "DDDD-DDDD-DDDD-DDDD"
            },
            valueType: EntryPropertyValueType.Password
        }),
        createFieldDescriptor(entry, "Card Type", EntryPropertyType.Property, "type", {
            formatting: {
                options: {
                    visa: "Visa",
                    mastercard: "Mastercard",
                    amex: "American Express",
                    discover: "Discover",
                    generic: "Generic"
                },
                defaultOption: "generic"
            }
        }),
        createFieldDescriptor(entry, "CVV", EntryPropertyType.Property, "cvv", {
            formatting: {
                format: [{ char: DIGIT, repeat: 4 }],
                placeholder: "DDD or DDDD"
            },
            valueType: EntryPropertyValueType.Password
        }),
        createFieldDescriptor(entry, "Valid From", EntryPropertyType.Property, "valid_from", {
            formatting: {
                format: [
                    { char: "[01]", repeat: 1 },
                    { char: DIGIT, repeat: 1 },
                    { exactly: "/" },
                    { char: "2", repeat: 1 },
                    { char: DIGIT, repeat: 3 }
                ],
                placeholder: "MM/YYYY"
            }
        }),
        createFieldDescriptor(entry, "Expiry", EntryPropertyType.Property, "expiry", {
            formatting: {
                format: [
                    { char: "[01]", repeat: 1 },
                    { char: DIGIT, repeat: 1 },
                    { exactly: "/" },
                    { char: "2", repeat: 1 },
                    { char: DIGIT, repeat: 3 }
                ],
                placeholder: "MM/YYYY"
            }
        })
    ];
}

function createLoginFields(entry: Entry | null): Array<EntryFacadeField> {
    return [
        ...createBaseFields(entry),
        createFieldDescriptor(entry, "Username", EntryPropertyType.Property, "username"),
        createFieldDescriptor(entry, "Password", EntryPropertyType.Property, "password", {
            valueType: EntryPropertyValueType.Password
        }),
        // Optional: a Login with an address is matched to its site by the
        // browser extension (getEntryURLs reads property names, not the type)
        createFieldDescriptor(entry, "URL", EntryPropertyType.Property, getURLPropertyName(entry))
    ];
}

/**
 * The property a Login's URL field reads and writes: "url", or an existing
 * property named "url" in another case ("URL", "Url"), which Logins carried
 * as a custom field before they had a URL field. Using that property shows
 * its value in the URL field without copying or renaming anything, so the
 * entry isn't shown with two URL fields and stays unchanged for older apps.
 * @param entry The entry, or null for a new one
 * @returns The property name
 * @private
 */
function getURLPropertyName(entry: Entry | null): string {
    if (!entry) return "url";
    const names = Object.keys(entry.getProperty() as Record<string, string>);
    if (names.includes("url")) return "url";
    return names.find((name) => name.toLowerCase() === "url") ?? "url";
}

function createNoteFields(entry: Entry | null): Array<EntryFacadeField> {
    return [
        ...createBaseFields(entry),
        createFieldDescriptor(entry, "Note", EntryPropertyType.Property, "note", {
            valueType: EntryPropertyValueType.Note
        })
    ];
}

function createSSHKeyFields(entry: Entry | null): Array<EntryFacadeField> {
    return [
        ...createBaseFields(entry),
        createFieldDescriptor(entry, "Public key", EntryPropertyType.Property, "publicKey"),
        createFieldDescriptor(entry, "Private key", EntryPropertyType.Property, "privateKey", {
            valueType: EntryPropertyValueType.Note
        })
    ];
}

export default {
    [EntryType.CreditCard]: createCreditCardFields,
    [EntryType.Login]: createLoginFields,
    [EntryType.Note]: createNoteFields,
    [EntryType.SSHKey]: createSSHKeyFields,
    // Website was a Login with a URL. Logins have the URL field now, so a
    // stored Website entry gets the same fields; its type is kept as stored
    // so vaults shared with older apps stay unchanged (C-101)
    [EntryType.Website]: createLoginFields
};
