import { Entry } from "../core/Entry.js";
import { Group } from "../core/Group.js";
import { BaseSearch, ProcessedSearchEntry, SearcherFactory } from "./BaseSearch.js";
import { EntryURLType, getEntryURLs } from "../tools/entry.js";
import { fieldsToAttributes, fieldsToProperties } from "../facades/entry.js";
import { StorageInterface } from "../storage/StorageInterface.js";
import { EntryFacade, GroupID, VaultFacade } from "../types.js";
import { isValidTag } from "../tools/tag.js";

/**
 * IDs of the Trash group and every group inside it
 */
function getTrashGroupIDs(facade: VaultFacade): Set<GroupID> {
    // Facade groups from a vault always have IDs
    const trashIDs = new Set<GroupID>(
        facade.groups
            .filter((group) => group.attributes?.[Group.Attribute.Role] === "trash")
            .map((group) => group.id!)
    );
    let added = trashIDs.size > 0;
    while (added) {
        added = false;
        for (const group of facade.groups) {
            if (!trashIDs.has(group.id!) && trashIDs.has(group.parentID)) {
                trashIDs.add(group.id!);
                added = true;
            }
        }
    }
    return trashIDs;
}

async function extractEntries(
    facade: VaultFacade,
    memory: StorageInterface
): Promise<Array<ProcessedSearchEntry>> {
    // Get scores
    const scoresRaw = await memory.getValue(`bcup_search_${facade.id}`);
    let vaultScore: { [entryID: string]: { [domain: string]: number } } = {};
    if (scoresRaw) {
        try {
            const scores = JSON.parse(scoresRaw);
            vaultScore = scores;
        } catch (err) {}
    }
    // Get entries, except those in Trash
    const trashGroupIDs = getTrashGroupIDs(facade);
    return facade.entries.reduce((entries: Array<ProcessedSearchEntry>, nextEntry: EntryFacade) => {
        if (trashGroupIDs.has(nextEntry.parentID)) return entries;
        const attributes = fieldsToAttributes(nextEntry.fields);
        const tags = attributes[Entry.Attributes.Tags]
            ? attributes[Entry.Attributes.Tags].split(",").reduce((output: Array<string>, tag) => {
                  return isValidTag(tag) ? [...output, tag] : output;
              }, [])
            : [];
        const properties = fieldsToProperties(nextEntry.fields);
        const urls = getEntryURLs(properties, EntryURLType.General);
        entries.push({
            domainScores: vaultScore[nextEntry.id!] || {},
            entryType: nextEntry.type,
            groupID: nextEntry.parentID,
            id: nextEntry.id!,
            properties,
            tags,
            urls,
            vaultID: facade.id
        });
        return entries;
    }, []);
}

export class VaultFacadeEntrySearch extends BaseSearch<VaultFacade> {
    constructor(
        facades: Array<VaultFacade>,
        memory?: StorageInterface,
        searcherFactory?: SearcherFactory
    ) {
        super(facades, extractEntries, memory, searcherFactory);
    }
}
