import { newRawValue } from "./history.js";
import { getDateString } from "../../tools/date.js";
import {
    getAllEntries as getAllFormatAEntries,
    getAllGroups as getAllFormatAGroups
} from "../formatA/tools.js";
import {
    EntryPropertyType,
    FormatAEntry,
    FormatAGroup,
    FormatAVault,
    FormatBEntry,
    FormatBGroup,
    FormatBKeyValueObject,
    FormatBVault,
    FormatBValueHistoryItem,
    PropertyKeyValueObject
} from "../../types.js";

// Format A's history lists every value oldest first, including deletions and
// the current value. Format B's lists only previous values, newest first.
function previousValues(
    entry: FormatAEntry,
    key: string,
    propertyType: EntryPropertyType,
    current: string
): Array<FormatBValueHistoryItem> {
    const values = (entry.history || [])
        .filter(
            (change) =>
                change.property === key &&
                change.propertyType === propertyType &&
                typeof change.newValue === "string"
        )
        .map((change) => change.newValue as string);
    if (values[values.length - 1] === current) {
        values.pop();
    }
    return values.reverse().map((value) => ({ value, updated: null }));
}

export function convertFormatAEntry(entry: FormatAEntry): FormatBEntry {
    const formatBEntry = {
        id: entry.id,
        a: flatKeyValueObjectToValuesObject(entry.attributes || {}),
        p: flatKeyValueObjectToValuesObject(entry.properties || {}),
        g: entry.parentID
    };
    for (const key in formatBEntry.a) {
        const item = formatBEntry.a[key];
        item.history = previousValues(entry, key, EntryPropertyType.Attribute, item.value);
    }
    for (const key in formatBEntry.p) {
        const item = formatBEntry.p[key];
        item.history = previousValues(entry, key, EntryPropertyType.Property, item.value);
    }
    return formatBEntry;
}

export function convertFormatAGroup(group: FormatAGroup): FormatBGroup {
    return {
        id: group.id,
        a: flatKeyValueObjectToValuesObject(group.attributes || {}),
        t: group.title,
        g: group.parentID
    };
}

export function convertFormatAVault(vault: FormatAVault): FormatBVault {
    return {
        id: vault.id,
        a: flatKeyValueObjectToValuesObject(vault.attributes || {}),
        g: getAllFormatAGroups(vault).map((group) => convertFormatAGroup(group)),
        e: getAllFormatAEntries(vault).map((entry) => convertFormatAEntry(entry)),
        c: getDateString(),
        del: {
            e: {},
            g: {}
        }
    };
}

function flatKeyValueObjectToValuesObject(obj: PropertyKeyValueObject): FormatBKeyValueObject {
    return Object.keys(obj).reduce(
        (output, key) =>
            Object.assign(output, {
                [key]: newRawValue(obj[key])
            }),
        {}
    );
}

export function isFormatBEntry(entry: FormatAEntry | FormatBEntry): entry is FormatBEntry {
    return (<FormatBEntry>entry).g !== undefined;
}

export function isFormatBGroup(group: FormatAGroup | FormatBGroup): group is FormatBGroup {
    return (<FormatBGroup>group).g !== undefined;
}

/**
 * Get a key-value object from a Format-B values object.
 * This strips deleted properties.
 * @param valuesObj
 */
export function valuesObjectToKeyValueObject(
    valuesObj: FormatBKeyValueObject
): PropertyKeyValueObject {
    return Object.keys(valuesObj).reduce((output, key) => {
        if (valuesObj[key].deleted) return output;
        return Object.assign(output, {
            [key]: valuesObj[key].value
        });
    }, {});
}
