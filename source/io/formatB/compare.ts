import { hasOwn } from "../../tools/object.js";
import { sortValueHistory } from "./history.js";
import { FormatBKeyValueObject, FormatBValue, FormatBVault, History } from "../../types.js";

export function historiesDiffer(historyA: History, historyB: History) {
    const vaultA = inflateHistory(historyA);
    const vaultB = inflateHistory(historyB);
    if (vaultA.e.length !== vaultB.e.length) return true;
    if (vaultA.g.length !== vaultB.g.length) return true;
    if (propertiesDiffer(vaultA.a, vaultB.a)) return true;
    return [
        [vaultA, vaultB],
        [vaultB, vaultA]
    ].some(([item1, item2]: Array<FormatBVault>) => {
        const diffEntries = item1.e.some((entry1) => {
            // Check entries
            const matching = item2.e.find((entry2) => entry2.id === entry1.id);
            if (!matching) return true;
            if (entry1.g !== matching.g) return true;
            // Check entry properties
            return propertiesDiffer(entry1.p, matching.p) || propertiesDiffer(entry1.a, matching.a);
        });
        if (diffEntries && item1.e.length > 0) return true;
        const diffGroups = item1.g.some((group1) => {
            const matching = item2.g.find((group2) => group2.id === group1.id);
            if (!matching) return true;
            if (group1.g !== matching.g) return true;
            // Check properties
            if (group1.t !== matching.t) return true;
            return propertiesDiffer(group1.a, matching.a);
        });
        if (diffGroups && item1.g.length > 0) return true;
        return false;
    });
}

// Only own keys count: names are user-controlled (see tools/object.ts). A
// missing value is undefined, which valuesDiffer treats as absent.
function ownValue(props: FormatBKeyValueObject, key: string): FormatBValue {
    return (hasOwn(props, key) ? props[key] : undefined) as FormatBValue;
}

// A missing deletion time and a non-number one both mean "not deleted"
function deletedTime(deleted: unknown): number | null {
    return typeof deleted === "number" ? deleted : null;
}

function inflateHistory(history: History): FormatBVault {
    return JSON.parse(history[0]) as FormatBVault;
}

export function propertiesDiffer(
    props1: FormatBKeyValueObject,
    props2: FormatBKeyValueObject
): boolean {
    const allKeys = [...new Set([...Object.keys(props1), ...Object.keys(props2)])];
    if (allKeys.length === 0) return false;
    return allKeys.some((key) => valuesDiffer(ownValue(props1, key), ownValue(props2, key)));
}

export function valuesDiffer(value1: FormatBValue, value2: FormatBValue): boolean {
    if ((!value1 && value2) || (value1 && !value2)) return true;
    for (const prop of ["value", "created", "updated"]) {
        if (value1[prop as keyof FormatBValue] !== value2[prop as keyof FormatBValue]) return true;
    }
    // Deleting a value sets only `deleted`, so it must count as a change, or
    // a save on another device writes the value back (B-691)
    if (deletedTime(value1.deleted) !== deletedTime(value2.deleted)) return true;
    if (value1.history.length !== value2.history.length) return true;
    if (value1.history.length === 0) return false;
    const hist1 = sortValueHistory([...value1.history]);
    const hist2 = sortValueHistory([...value2.history]);
    for (const ind in hist1) {
        if (
            hist1[ind].value !== hist2[ind].value ||
            hist1[ind].updated !== hist2[ind].updated ||
            deletedTime(hist1[ind].deleted) !== deletedTime(hist2[ind].deleted)
        )
            return true;
    }
    return false;
}
