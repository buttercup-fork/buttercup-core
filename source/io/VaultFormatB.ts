import { ORPHANS_GROUP_TITLE, VaultFormat } from "./VaultFormat.js";
import { Vault } from "../core/Vault.js";
import { generateUUID } from "../tools/uuid.js";
import { getSharedAppEnv } from "../env/appEnv.js";
import { Layerr } from "layerr";
import { ErrorCode, withDecryptionErrorCode } from "../tools/error.js";
import { getMasterPassword } from "../credentials/memory/password.js";
import { Credentials } from "../credentials/Credentials.js";
import { historyArrayToString, historyStringToArray } from "./common.js";
import {
    hasValidSignature,
    sign,
    stripSignature,
    vaultContentsEncrypted
} from "./formatB/signing.js";
import { historiesDiffer } from "./formatB/compare.js";
import { mergeRawVaults } from "./formatB/merge.js";
import { valuesObjectToKeyValueObject } from "./formatB/conversion.js";
import {
    newRawValue,
    nextDeleteTimestamp,
    nextUpdateTimestamp,
    valueToHistoryItem
} from "./formatB/history.js";
import { getDateString } from "../tools/date.js";
import { assertValidPropertyName, hasOwn } from "../tools/object.js";
import {
    EntryChange,
    EntryChangeType,
    EntryID,
    FormatBEntry,
    FormatBGroup,
    FormatBKeyValueObject,
    FormatBValueHistoryItem,
    FormatBVault,
    GroupID,
    History,
    PropertyKeyValueObject,
    VaultFormatID,
    VaultID
} from "../types.js";

const DELETION_LIST_TTL = 12 * 7 * 24 * 60 * 60 * 1000; // 12 weeks

function emptyVault(): FormatBVault {
    return {
        // Set by generateID()
        id: null as unknown as VaultID,
        a: {},
        g: [],
        e: [],
        c: getDateString(),
        del: {
            e: {},
            g: {}
        }
    };
}

// Values are keyed by user-controlled names, so only own keys count: see
// tools/object.ts.

function deleteRawValue(values: FormatBKeyValueObject, key: string): boolean {
    if (!hasOwn(values, key)) return false;
    values[key].deleted = nextDeleteTimestamp(values[key]);
    return true;
}

function setRawValue(values: FormatBKeyValueObject, key: string, value: string) {
    assertValidPropertyName(key);
    if (!hasOwn(values, key)) {
        values[key] = newRawValue(value);
        return;
    }
    const item = values[key];
    // Writing the value it already has isn't a change, so it adds no history
    // (a deleted value written again is restored below)
    if (!item.deleted && item.value === value) return;
    item.history.unshift(valueToHistoryItem(item));
    item.value = value;
    item.updated = nextUpdateTimestamp(item);
    // Writing a value un-deletes it
    delete item.deleted;
}

export class VaultFormatB extends VaultFormat {
    static encodeRaw(rawContent: History, credentials: Credentials): Promise<string> {
        const compress = getSharedAppEnv().getProperty("compression/v2/compressText");
        const encrypt = getSharedAppEnv().getProperty("crypto/v1/encryptText");
        const masterPassword = getMasterPassword(credentials.id);
        return Promise.resolve()
            .then(() => historyArrayToString(rawContent))
            .then((history) => compress(history))
            .then((compressed) => encrypt(compressed, masterPassword))
            .then(sign);
    }

    static extractSharesFromHistory(history: History): Object {
        return {};
    }

    static getFormatID(): VaultFormatID {
        return VaultFormatID.B;
    }

    static historiesDiffer(historyA: History, historyB: History): boolean {
        return historiesDiffer(historyA, historyB);
    }

    static isEncrypted(contents: string): boolean {
        return vaultContentsEncrypted(contents);
    }

    static parseEncrypted(encryptedContent: string, credentials: Credentials): Promise<History> {
        const decompress = getSharedAppEnv().getProperty("compression/v2/decompressText");
        const decrypt = getSharedAppEnv().getProperty("crypto/v1/decryptText");
        const masterPassword = getMasterPassword(credentials.id);
        return Promise.resolve()
            .then(() => {
                if (!hasValidSignature(encryptedContent)) {
                    throw new Layerr(
                        { info: { code: ErrorCode.InvalidVaultSignature } },
                        "No valid signature in vault"
                    );
                }
                return stripSignature(encryptedContent);
            })
            .then((encryptedData) =>
                withDecryptionErrorCode<string>(decrypt(encryptedData, masterPassword), "vault")
            )
            .then(async (decrypted) => {
                const decompressed = await decompress(decrypted);
                return historyStringToArray(decompressed, VaultFormatID.B);
            });
    }

    static vaultFromMergedHistories(base: History, incoming: History): Vault {
        const baseRaw = JSON.parse(base[0]) as FormatBVault;
        const incomingRaw = JSON.parse(incoming[0]) as FormatBVault;
        const merged = mergeRawVaults(baseRaw, incomingRaw);
        const vault = new Vault();
        vault._format = new VaultFormatB(merged);
        return vault;
    }

    // Set by the VaultFormat constructor
    public source!: FormatBVault;

    constructor(source: FormatBVault = emptyVault()) {
        super(source);
    }

    cloneEntry(entry: FormatBEntry, targetGroupID: GroupID) {}

    cloneGroup(group: FormatBGroup, targetGroupID: GroupID) {
        const newGroup = JSON.parse(JSON.stringify(group)) as FormatBGroup;
        newGroup.id = generateUUID();
        newGroup.g = targetGroupID;
        this.source.g.push(newGroup);
        // clone entries
        const childEntries = this.source.e
            .filter((entry) => entry.g === group.id)
            .map((entry) => {
                const newEntry = JSON.parse(JSON.stringify(entry));
                newEntry.g = newGroup.id;
                return newEntry;
            });
        this.source.e.push(...childEntries);
        // clone groups
        this.source.g.forEach((childGroup) => {
            if (childGroup.g === group.id) {
                this.cloneGroup(childGroup, newGroup.id);
            }
        });
        this.emit("commandsExecuted");
    }

    createEntry(groupID: GroupID, entryID: EntryID) {
        const entry: FormatBEntry = {
            id: entryID,
            g: groupID,
            p: {},
            a: {}
        };
        this.source.e.push(entry);
        this.emit("commandsExecuted");
    }

    createGroup(parentID: GroupID, groupID: GroupID) {
        const group: FormatBGroup = {
            id: groupID,
            g: parentID,
            t: "New group",
            a: {}
        };
        this.source.g.push(group);
        this.emit("commandsExecuted");
    }

    deleteEntry(entryID: EntryID) {
        const ind = this.source.e.findIndex((entry) => entry.id === entryID);
        if (ind >= 0) {
            this.source.e.splice(ind, 1);
            this.ensureDeletionRegister().e[entryID] = Date.now();
            this.emit("commandsExecuted");
        }
    }

    deleteEntryAttribute(entryID: EntryID, attribute: string) {
        const entry = this.source.e.find((e: FormatBEntry) => e.id === entryID)!;
        if (!deleteRawValue(entry.a, attribute)) return;
        this.emit("commandsExecuted");
    }

    deleteEntryProperty(entryID: EntryID, property: string) {
        const entry = this.source.e.find((e) => e.id === entryID)!;
        if (!deleteRawValue(entry.p, property)) return;
        this.emit("commandsExecuted");
    }

    deleteGroup(groupID: GroupID) {
        const ind = this.source.g.findIndex((group) => group.id === groupID);
        if (ind >= 0) {
            this.source.g.splice(ind, 1);
            this.ensureDeletionRegister().g[groupID] = Date.now();
            this.emit("commandsExecuted");
        }
    }

    deleteGroupAttribute(groupID: GroupID, attribute: string) {
        const group = this.source.g.find((g) => g.id === groupID)!;
        if (!deleteRawValue(group.a, attribute)) return;
        this.emit("commandsExecuted");
    }

    deleteVaultAttribute(attribute: string) {
        if (!deleteRawValue(this.source.a, attribute)) return;
        this.emit("commandsExecuted");
    }

    erase() {
        super.erase();
        Object.assign(this.source, emptyVault());
        this.emit("erased");
    }

    /**
     * Ensure the deletion-tombstone register exists on the source.
     * Vaults persisted by older versions of Buttercup (before deletion
     * tombstones were introduced) can have their `del` key replaced
     * entirely by `execute()`, which overwrites `this.source` wholesale
     * with the parsed, persisted history - bypassing `initialise()`.
     * @returns The deletion register
     */
    private ensureDeletionRegister(): { e: Record<EntryID, number>; g: Record<GroupID, number> } {
        if (!this.source.del) {
            this.source.del = { e: {}, g: {} };
        }
        if (!this.source.del.e) {
            this.source.del.e = {};
        }
        if (!this.source.del.g) {
            this.source.del.g = {};
        }
        return this.source.del;
    }

    execute(commandOrCommands: string | Array<string>) {
        let command: string;
        if (Array.isArray(commandOrCommands)) {
            if (commandOrCommands.length !== 1) {
                throw new Error(
                    `Format-B commands array must contain a single command, received: ${commandOrCommands.length}`
                );
            }
            command = commandOrCommands[0];
        } else {
            command = commandOrCommands;
        }
        this.source = JSON.parse(command);
        this.dirty = true;
        this.emit("commandsExecuted");
    }

    findEntryByID(id: EntryID): FormatBEntry | null {
        return this.source.e.find((entry) => entry.id === id) || null;
    }

    findGroupByID(id: GroupID): FormatBGroup | null {
        return this.source.g.find((group) => group.id === id) || null;
    }

    findGroupContainingEntryID(id: EntryID): FormatBGroup | null {
        const matchingEntry = this.getAllEntries().find((entry) => entry.id === id);
        if (matchingEntry) {
            return this.getAllGroups().find((group) => group.id === matchingEntry.g) || null;
        }
        return null;
    }

    findGroupContainingGroupID(id: GroupID): FormatBGroup | null {
        const groups = this.getAllGroups();
        const matchingGroup = groups.find((group) => group.id === id);
        if (!matchingGroup) return null;
        return groups.find((group) => group.id === matchingGroup.g) || null;
    }

    generateID() {
        this.source.id = generateUUID();
        this.emit("commandsExecuted");
    }

    getAllEntries(parentID: GroupID | null = null): Array<FormatBEntry> {
        const source = this.source as FormatBVault;
        return parentID === null ? source.e : source.e.filter((entry) => entry.g === parentID);
    }

    getAllGroups(parentID: GroupID | null = null): Array<FormatBGroup> {
        const source = this.source as FormatBVault;
        return parentID === null ? source.g : source.g.filter((group) => group.g === parentID);
    }

    getEntryAttributes(entrySource: FormatBEntry): PropertyKeyValueObject {
        return valuesObjectToKeyValueObject(entrySource.a);
    }

    getEntryChanges(entrySource: FormatBEntry): Array<EntryChange> {
        return Object.keys(entrySource.p).reduce((changes: Array<EntryChange>, property) => {
            const item = entrySource.p[property];
            // History holds previous values, newest first. A deleted property's
            // last value isn't current any more, so it is a previous value too.
            const values: Array<FormatBValueHistoryItem> = [...item.history].reverse();
            if (item.deleted) {
                values.push({ value: item.value, updated: item.updated });
            }
            return [
                ...changes,
                ...values.flatMap((histItem, index) => {
                    const change: EntryChange = {
                        property,
                        type:
                            histItem.updated === item.created ||
                            // Written again after a deletion: added anew, as in Format A
                            typeof values[index - 1]?.deleted === "number"
                                ? EntryChangeType.Created
                                : EntryChangeType.Modified,
                        ts: histItem.updated,
                        value: histItem.value
                    };
                    // Deleted, then written again later
                    return typeof histItem.deleted === "number"
                        ? [
                              change,
                              {
                                  property,
                                  type: EntryChangeType.Deleted,
                                  ts: histItem.deleted,
                                  value: null
                              }
                          ]
                        : [change];
                }),
                ...(item.deleted
                    ? [
                          {
                              property,
                              type: EntryChangeType.Deleted,
                              ts: item.deleted,
                              value: null
                          }
                      ]
                    : [])
            ];
        }, []);
    }

    getEntryProperties(entrySource: FormatBEntry): PropertyKeyValueObject {
        return valuesObjectToKeyValueObject(entrySource.p);
    }

    getFormat() {
        return VaultFormatB;
    }

    getGroupAttributes(groupSource: FormatBGroup): PropertyKeyValueObject {
        return valuesObjectToKeyValueObject(groupSource.a);
    }

    getGroupTitle(groupSource: FormatBGroup): string {
        return groupSource.t;
    }

    getHistory(): History {
        const hist = <History>[JSON.stringify(this.source)];
        hist.format = VaultFormatID.B;
        return hist;
    }

    getItemID(itemSource: FormatBGroup | FormatBEntry): GroupID | EntryID {
        return itemSource.id;
    }

    getItemParentID(itemSource: FormatBGroup | FormatBEntry): GroupID | "0" {
        return itemSource.g;
    }

    getVaultAttributes() {
        return valuesObjectToKeyValueObject((<FormatBVault>this.source).a);
    }

    getVaultID(): VaultID {
        return this.source.id;
    }

    initialise() {
        Object.assign(this.source, {
            a: this.source.a || {},
            g: this.source.g || [],
            e: this.source.e || [],
            del: this.source.del || {}
        });
        if (!this.source.del.e) {
            this.source.del.e = {};
        }
        if (!this.source.del.g) {
            this.source.del.g = {};
        }
        if (!this.source.id) {
            // Emits "commandsExecuted"
            this.generateID();
        } else {
            this.emit("commandsExecuted");
        }
    }

    moveEntry(entryID: EntryID, groupID: GroupID) {
        const entry = this.source.e.find((e: FormatBEntry) => e.id === entryID)!;
        entry.g = groupID;
        this.emit("commandsExecuted");
    }

    moveGroup(groupID: GroupID, newParentID: GroupID) {
        const group = this.source.g.find((g: FormatBGroup) => g.id === groupID)!;
        group.g = newParentID;
        this.emit("commandsExecuted");
    }

    optimise() {
        // Initialise first
        this.initialise();
        // Clean up orphans
        {
            // Groups
            const groups = this.getAllGroups();
            const groupIDs = ["0", ...groups.map((g) => g.id)];
            for (const group of groups) {
                if (groupIDs.includes(group.g) === false) {
                    // Re-attach orphaned group
                    const orphansGroup = this.prepareOrphansGroup();
                    this.moveGroup(group.id, orphansGroup.id);
                }
            }
        }
        {
            // Entries
            const groups = this.getAllGroups();
            const groupIDs = ["0", ...groups.map((g) => g.id)];
            const entries = this.getAllEntries();
            for (const entry of entries) {
                if (groupIDs.includes(entry.g) === false) {
                    // Re-attach orphaned entry
                    const orphansGroup = this.prepareOrphansGroup();
                    this.moveEntry(entry.id, orphansGroup.id);
                }
            }
        }
        // Clean up deletion registers (expired)
        const cutoff = Date.now() - DELETION_LIST_TTL;
        for (const entryID in this.source.del.e) {
            if (this.source.del.e[entryID] < cutoff) {
                delete this.source.del.e[entryID];
            }
        }
        for (const groupID in this.source.del.g) {
            if (this.source.del.g[groupID] < cutoff) {
                delete this.source.del.g[groupID];
            }
        }
        this.emit("commandsExecuted");
    }

    prepareOrphansGroup(): FormatBGroup {
        let orphansGroup: FormatBGroup | null | undefined = this.getAllGroups().find(
            (g) => g.t === ORPHANS_GROUP_TITLE
        );
        if (!orphansGroup) {
            const id = generateUUID();
            this.createGroup("0", id);
            this.setGroupTitle(id, ORPHANS_GROUP_TITLE);
            orphansGroup = this.findGroupByID(id);
            if (!orphansGroup) {
                throw new Error("Failed creating Orphaned Items group");
            }
        }
        return orphansGroup;
    }

    setEntryAttribute(entryID: EntryID, attribute: string, value: string) {
        const entry = this.source.e.find((e: FormatBEntry) => e.id === entryID)!;
        setRawValue(entry.a, attribute, value);
        this.emit("commandsExecuted");
    }

    setEntryProperty(entryID: EntryID, property: string, value: string) {
        const entry = this.source.e.find((e: FormatBEntry) => e.id === entryID)!;
        setRawValue(entry.p, property, value);
        this.emit("commandsExecuted");
    }

    setGroupAttribute(groupID: GroupID, attribute: string, value: string) {
        const group = this.source.g.find((g: FormatBGroup) => g.id === groupID)!;
        setRawValue(group.a, attribute, value);
        this.emit("commandsExecuted");
    }

    setGroupTitle(groupID: GroupID, title: string) {
        const group = this.source.g.find((g: FormatBGroup) => g.id === groupID)!;
        group.t = title;
        this.emit("commandsExecuted");
    }

    setVaultAttribute(key: string, value: string) {
        setRawValue(this.source.a, key, value);
        this.emit("commandsExecuted");
    }
}
