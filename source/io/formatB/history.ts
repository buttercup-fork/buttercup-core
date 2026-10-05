import { getTimestamp } from "../../tools/date.js";
import { EntryPropertyType, FormatBValue, FormatBValueHistoryItem } from "../../types.js";

export const MAX_ATTRIBUTE_HISTORY = 3;
export const MAX_PROPERTY_HISTORY = 5;

export function cloneValue(value: FormatBValue): FormatBValue {
    const cloned: FormatBValue = {
        value: value.value,
        created: value.created,
        updated: value.updated,
        history: value.history.map((item) => Object.assign({}, item))
    };
    if (typeof value.deleted === "number") {
        // Preserve the deletion tombstone, otherwise a merge resurrects the
        // property/attribute (buttercup/buttercup-desktop#1342).
        cloned.deleted = value.deleted;
    }
    return cloned;
}

function filterDuplicateHistoryItems(
    items: Array<FormatBValueHistoryItem>
): Array<FormatBValueHistoryItem> {
    return items.reduce((output: Array<FormatBValueHistoryItem>, item) => {
        const existing = output.find(
            (sub) => sub.value === item.value && sub.updated === item.updated
        );
        if (!existing) {
            output.push(Object.assign({}, item));
        } else if (typeof item.deleted === "number") {
            // One side may know the value was deleted before it was rewritten
            existing.deleted = Math.max(existing.deleted ?? 0, item.deleted);
        }
        return output;
    }, []);
}

export function mergeValues(
    value1: FormatBValue,
    value2: FormatBValue,
    type: EntryPropertyType
): FormatBValue {
    const mostRecentValue =
        value1.updated > value2.updated || value1.updated === value2.updated ? value1 : value2;
    const olderValue = value1 === mostRecentValue ? value2 : value1;
    const newHistory = sortValueHistory(
        filterDuplicateHistoryItems([
            valueToHistoryItem(olderValue),
            ...value1.history,
            ...value2.history
        ]).filter(
            // History holds previous values only: when both sides have the
            // same value, the older one isn't a previous value
            (item) =>
                item.value !== mostRecentValue.value || item.updated !== mostRecentValue.updated
        )
    );
    const merged: FormatBValue = {
        value: mostRecentValue.value,
        created: mostRecentValue.created,
        updated: mostRecentValue.updated,
        history: trimValueHistory(newHistory, type)
    };
    // Resolve deletion state: the property/attribute stays deleted unless it was
    // (re)written more recently than it was deleted on either side. Dropping this
    // entirely made a merge resurrect deleted custom fields
    // (buttercup/buttercup-desktop#1342).
    const latestDeleted = Math.max(value1.deleted ?? 0, value2.deleted ?? 0);
    const latestUpdated = Math.max(value1.updated, value2.updated);
    if (latestDeleted > 0 && latestDeleted >= latestUpdated) {
        merged.deleted = latestDeleted;
    }
    return merged;
}

/**
 * Timestamp for a new write to an existing value. Merges keep whichever
 * value has the later `updated` time, so a write must always be later than
 * the state it replaces - even if the system clock has gone backwards since
 * (NTP corrections, VM/WSL clock sync, a user fixing their clock). Otherwise
 * the next merge silently reverts the edit.
 */
export function nextUpdateTimestamp(value: FormatBValue): number {
    return Math.max(getTimestamp(), value.updated + 1, (value.deleted ?? 0) + 1);
}

/**
 * Timestamp for deleting an existing value. Merges treat a value as deleted
 * when its deletion time is at or after its last update, so the deletion
 * must not be earlier than the value's `updated` time, whatever the clock
 * says.
 */
export function nextDeleteTimestamp(value: FormatBValue): number {
    return Math.max(getTimestamp(), value.updated);
}

export function newRawValue(value: string): FormatBValue {
    const ts = getTimestamp();
    return {
        value,
        created: ts,
        updated: ts,
        history: []
    };
}

export function sortValueHistory(
    history: Array<FormatBValueHistoryItem>
): Array<FormatBValueHistoryItem> {
    return history.sort((a, b) => {
        // Null timestamps (converted Format A history) compare as 0, as JS does
        if ((a.updated as number) > (b.updated as number)) {
            return -1;
        } else if ((b.updated as number) > (a.updated as number)) {
            return 1;
        }
        return 0;
    });
}

export function trimValueHistory(
    history: Array<FormatBValueHistoryItem>,
    type: EntryPropertyType
): Array<FormatBValueHistoryItem> {
    const max = type === EntryPropertyType.Attribute ? MAX_ATTRIBUTE_HISTORY : MAX_PROPERTY_HISTORY;
    const sorted = sortValueHistory(history);
    return sorted.slice(0, max);
}

export function valueToHistoryItem(value: FormatBValue): FormatBValueHistoryItem {
    const item: FormatBValueHistoryItem = {
        value: value.value,
        updated: value.updated
    };
    if (typeof value.deleted === "number") {
        // Written again after it was deleted: keep when (buttercup-core B-456)
        item.deleted = value.deleted;
    }
    return item;
}
