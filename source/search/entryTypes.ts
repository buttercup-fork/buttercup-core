import { EntryType } from "../types.js";

const TYPE_FILTER = /^type:(.+)$/i;

function normaliseTypeName(name: string): string {
    return name.toLowerCase().replace(/[\s_-]/g, "");
}

// "credit_card" can also be written "creditcard" or "credit-card"
const TYPES_BY_NAME = new Map<string, EntryType>(
    Object.values(EntryType).map((type) => [normaliseTypeName(type), type])
);

/**
 * Extract entry type filters ("type:login", "type:ssh_key") from a search
 * term. Only known entry types are extracted - anything else, such as
 * "type:foo", stays part of the search term.
 * @param term The search term
 * @returns The entry types found, and the rest of the search term
 */
export function extractEntryTypesFromSearchTerm(term: string): {
    entryTypes: Array<EntryType>;
    term: string;
} {
    const searchItems: Array<string> = [];
    const entryTypes = new Set<EntryType>();
    const parts = term.split(/\s+/g);
    for (const part of parts) {
        const match = TYPE_FILTER.exec(part);
        const type = match ? TYPES_BY_NAME.get(normaliseTypeName(match[1])) : undefined;
        if (type) {
            entryTypes.add(type);
        } else if (part.length > 0) {
            searchItems.push(part);
        }
    }
    return {
        entryTypes: [...entryTypes],
        term: searchItems.join(" ").trim()
    };
}
