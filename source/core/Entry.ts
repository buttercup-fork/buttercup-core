import { VaultItem } from "./VaultItem.js";
import { generateUUID } from "../tools/uuid.js";
import { getEntryURLs, EntryURLType } from "../tools/entry.js";
import { Group } from "./Group.js";
import { Vault } from "./Vault.js";
import { isValidTag } from "../tools/tag.js";
import {
    EntryChange,
    EntryID,
    EntryPropertyLink,
    EntryPropertyValueType,
    EntryType,
    GroupID,
    PropertyKeyValueObject
} from "../types.js";

/**
 * Entry class - some secret item, login or perhaps
 * even a credit card
 * @augments VaultItem
 */
export class Entry extends VaultItem {
    static Attributes = Object.freeze({
        AttachmentPrefix: "BC_ENTRY_ATTACHMENT:",
        FacadeType: "BC_ENTRY_FACADE_TYPE",
        FieldTypePrefix: "BC_ENTRY_FIELD_TYPE:",
        PropertyLinkPrefix: "BC_ENTRY_PROPERTY_LINK:",
        Tags: "BC_ENTRY_TAGS"
    });

    /**
     * Create a new Entry instance within a vault
     *  and group
     * @param vault The target vault instance
     * @param parentGroupID The target group to
     *  create the entry in (cannot be vault-level)
     * @static
     */
    static createNew(vault: Vault, parentGroupID: GroupID): Entry {
        // Check if group is trash/in-trash
        const group = vault.findGroupByID(parentGroupID);
        if (!group) {
            throw new Error(`Failed creating entry: no group found for ID: ${parentGroupID}`);
        } else if (group.isTrash() || group.isInTrash()) {
            throw new Error("Failed creating entry: cannot create within Trash group");
        }
        // Generate new entry ID
        const id = generateUUID();
        // Create new entry
        vault.format.createEntry(parentGroupID, id);
        vault._rebuild();
        return vault.findEntryByID(id);
    }

    /**
     * Add one or more tags to the entry
     * @param tags A collection of tag strings
     * @returns Self
     */
    addTags(...tags: Array<string>): this {
        const current = new Set(this.getTags());
        for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            if (!isValidTag(tagLower)) {
                throw new Error(`Cannot add entry tag: Invalid format: ${tagLower}`);
            }
            current.add(tagLower);
        }
        this.setAttribute(Entry.Attributes.Tags, [...current].join(","));
        return this;
    }

    /**
     * Delete the entry - either trashes the entry, or removes it completely.
     * If the entry is in the trash already, it is removed (including if there is no
     *    trash group). If the entry is in a normal group and a trash group exists, it
     *  is moved there instead of being deleted.
     * @param skipTrash Skip the trash and force-delete the entry
     * @see moveToGroup
     * @see Vault.getTrashGroup
     * @returns Whether or not the item was deleted
     */
    delete(skipTrash: boolean = false): boolean {
        const trashGroup = this.vault.getTrashGroup();
        const parentGroup = this.getGroup();
        const canTrash =
            trashGroup && parentGroup && !parentGroup.isTrash() && !parentGroup.isInTrash();
        if (canTrash && !skipTrash) {
            // trash it
            this.moveToGroup(trashGroup);
            return false;
        }
        // delete it
        this.vault.format.deleteEntry(this.id);
        const ind = this.vault._entries.indexOf(this);
        if (ind >= 0) {
            this.vault._entries.splice(ind, 1);
        }
        this._cleanUp();
        return true;
    }

    /**
     * Delete an attribute
     * @param attribute The attribute name
     * @throws {Error} Throws if the attribute doesn't exist, or cannot be deleted
     * @returns Self
     */
    deleteAttribute(attribute: string): this {
        this.vault.format.deleteEntryAttribute(this.id, attribute);
        return this;
    }

    /**
     * Delete a property
     * @throws {Error} Throws if property doesn't exist, or cannot be deleted
     * @param property The property to delete
     * @returns Self
     */
    deleteProperty(property: string): this {
        this.vault.format.deleteEntryProperty(this.id, property);
        this._deletePropertyLink(property);
        return this;
    }

    /**
     * Get an attribute
     * If no attribute name is specified, an object with all attributes and their
     * values is returned.
     * @param attribute The name of the attribute to fetch
     * @returns The attribute value or an object
     *  containing all attribute keys and their values if no attribute name
     *  is provided
     */
    getAttribute(): PropertyKeyValueObject;
    getAttribute(attribute: string): string | undefined;
    getAttribute(attribute?: string): PropertyKeyValueObject | string | undefined {
        const attributes = this.vault.format.getEntryAttributes(this._source) || {};
        if (typeof attribute === "undefined") {
            // No property, return entire object
            return Object.assign({}, attributes);
        }
        return attributes.hasOwnProperty(attribute) ? attributes[attribute] : undefined;
    }

    /**
     * Get an array of all history changes made to the entry
     */
    getChanges(): Array<EntryChange> {
        return this.vault.format.getEntryChanges(this._source);
    }

    /**
     * Get the containing group for the entry
     * @returns The parent group
     * @throws {Error} Throws if no parent group found
     */
    getGroup(): Group {
        const parentGroup = this.vault.format.findGroupContainingEntryID(this.id);
        if (!parentGroup) {
            throw new Error(`No parent group found for entry: ${this.id}`);
        }
        const parentID = this.vault.format.getItemID(parentGroup);
        return this.vault._groups.find((group) => group.id === parentID);
    }

    /**
     * Get a property value
     * If no property name is specified, an object with all properties and their
     * values is returned.
     * @param property The name of the property to fetch
     * @returns The property value or an object with all
     *  values if no property specified
     */
    getProperty(property?: string): PropertyKeyValueObject | string | undefined {
        if (typeof property === "undefined") {
            return this._getResolvedProperties();
        }
        const raw = this.vault.format.getEntryProperties(this._source);
        if (!raw.hasOwnProperty(property)) return undefined;
        const linkedValue = this._followPropertyLink(property);
        return linkedValue !== null ? linkedValue : raw[property];
    }

    /**
     * Get the link of a linked property
     * A linked property shows the current value of a property on another
     * entry (see {@link Entry.linkProperty}).
     * @param property The property name
     * @returns The linked entry ID and property, or `null` if the property
     *  isn't linked
     */
    getPropertyLink(property: string): EntryPropertyLink | null {
        const value = this.getAttribute(`${Entry.Attributes.PropertyLinkPrefix}${property}`);
        if (typeof value !== "string") return null;
        // Entry IDs contain no colons, property names may
        const separator = value.indexOf(":");
        if (separator <= 0 || separator === value.length - 1) return null;
        return {
            entryID: value.slice(0, separator),
            property: value.slice(separator + 1)
        };
    }

    /**
     * Set the value type of an entry property
     * @param property The property to get the value type of
     * @returns The property value type
     */
    getPropertyValueType(property: string): EntryPropertyValueType {
        const attr = this.getAttribute(
            `${Entry.Attributes.FieldTypePrefix}${property}`
        ) as EntryPropertyValueType;
        return attr || EntryPropertyValueType.Text;
    }

    /**
     * Get property values via RegExp expressions.
     * If no property expression is specified, it returns the empty behavior of
     * {@see Entry.getProperty}.
     * @param propertyExpression The expression to use to fetch properties. If
     *  a regular expression, it is then tested against all property keys. If a
     *  string, it's compared exactly.
     * @returns A key-value object of the matching properties
     */
    getProperties(propertyExpression?: RegExp | string): PropertyKeyValueObject {
        const raw = this._getResolvedProperties();
        if (typeof propertyExpression === "undefined") {
            return raw;
        }
        const isRexp = propertyExpression instanceof RegExp;
        return Object.keys(raw).reduce((aggr, key) => {
            const matches = isRexp
                ? (<RegExp>propertyExpression).test(key)
                : propertyExpression === key;
            return matches ? Object.assign(aggr, { [key]: raw[key] }) : aggr;
        }, {});
    }

    /**
     * Get entry tags
     * @returns An array of tag strings
     */
    getTags(): Array<string> {
        const tags = this.getAttribute(Entry.Attributes.Tags);
        return typeof tags === "string"
            ? tags.split(",").reduce((output, tag) => {
                  return isValidTag(tag) ? [...output, tag] : output;
              }, [])
            : [];
    }

    /**
     * Get the entry type
     * @returns The entry type
     */
    getType(): EntryType {
        return (
            <EntryType | undefined>this.getAttribute(Entry.Attributes.FacadeType) || EntryType.Login
        );
    }

    /**
     * Get an array of URLs from the Entry
     * Returns an array of detected URL values in the Entry's properties. The
     * types of URLs can be configured by providing a preference:
     *  - "general" - General URLs (of any type, preferring "URL" named props)
     *  - "login" - Prefer URLs whose key has "login" in it
     *  - "icon" - Return only icon-like URLs
     *  - "any" - Return all found URLs
     * @param urlTypePreference The URL type preference
     * @returns An array of URLs
     */
    getURLs(urlTypePreference: EntryURLType): Array<string> {
        return getEntryURLs(this.getProperty() as { [key: string]: string }, urlTypePreference);
    }

    /**
     * Check if the entry is in the trash
     * @returns Whether or not the entry is in the trash
     */
    isInTrash(): boolean {
        const group = this.getGroup();
        return group.isTrash() || group.isInTrash();
    }

    /**
     * Check if a linked property's link is broken
     * A link is broken when the linked entry was deleted or is in Trash, or
     * no longer has the linked property. A broken link shows the value the
     * property had when it was last in sync.
     * @param property The property name
     * @returns True if the property is linked and the link is broken
     */
    isPropertyLinkBroken(property: string): boolean {
        return !!this.getPropertyLink(property) && this._followPropertyLink(property) === null;
    }

    /**
     * Link a property to a property on another entry
     * The property then shows the current value of the other entry's
     * property, eg. several logins sharing one account's password. A copy
     * of the value is stored too, so that apps without link support still
     * show a real value. Setting the property later replaces the link with
     * its own value.
     * @param property The property to link (created if it doesn't exist)
     * @param target The entry to link to, in the same vault
     * @param targetProperty The property on the target entry to link to.
     *  Defaults to the same property name.
     * @returns Self
     * @throws {Error} Throws if the target is in another vault or in Trash,
     *  doesn't have the property, or the link would create a loop
     */
    linkProperty(property: string, target: Entry, targetProperty: string = property): this {
        if (target.vault !== this.vault) {
            throw new Error("Cannot link property: Target entry is in another vault");
        }
        if (target.isInTrash()) {
            throw new Error("Cannot link property: Target entry is in Trash");
        }
        if (typeof target.getProperty(targetProperty) !== "string") {
            throw new Error(
                `Cannot link property: Target entry has no property: ${targetProperty}`
            );
        }
        // Walk the target's links, checking they don't lead back here
        let linkedEntry: Entry = target,
            linkedProperty = targetProperty;
        const visited = new Set<string>();
        while (linkedEntry) {
            const key = `${linkedEntry.id}:${linkedProperty}`;
            if ((linkedEntry.id === this.id && linkedProperty === property) || visited.has(key)) {
                throw new Error("Cannot link property: Link would create a loop");
            }
            visited.add(key);
            const link = linkedEntry.getPropertyLink(linkedProperty);
            linkedEntry = link ? this.vault.findEntryByID(link.entryID) : null;
            linkedProperty = link ? link.property : null;
        }
        this.setAttribute(
            `${Entry.Attributes.PropertyLinkPrefix}${property}`,
            `${target.id}:${targetProperty}`
        );
        this._storePropertyLinkCopy(property, target.getProperty(targetProperty) as string);
        return this;
    }

    /**
     * Move the entry to another group
     * @returns Returns self
     * @param group The target group
     */
    moveToGroup(group: Group): this {
        this.vault.format.moveEntry(this.id, group.id);
        return this;
    }

    /**
     * Remove one or more tags
     * @param tags Collection of tags to remove
     * @returns Self
     */
    removeTags(...tags: Array<string>): this {
        const current = new Set(this.getTags());
        for (const tag of tags) {
            const tagLower = tag.toLowerCase();
            current.delete(tagLower);
        }
        this.setAttribute(Entry.Attributes.Tags, [...current].join(","));
        return this;
    }

    /**
     * Set an attribute on the entry
     * @param attribute The name of the attribute
     * @param value The value to set
     * @returns Returns self
     */
    setAttribute(attribute: string, value: string): this {
        this.vault.format.setEntryAttribute(this.id, attribute, value);
        return this;
    }

    /**
     * Set a property on the entry
     * @param property The property name
     * @param value The property value
     * @returns Returns self
     */
    setProperty(property: string, value: string): this {
        // Setting a linked property replaces the link with its own value
        this._deletePropertyLink(property);
        this.vault.format.setEntryProperty(this.id, property, value);
        return this;
    }

    /**
     * Set the value type of an entry property
     * @param property The property to set the value type for
     * @param valueType The new value type to set, or `null` to remove
     * @returns Returns self
     */
    setPropertyValueType(property: string, valueType: EntryPropertyValueType | null): this {
        if (valueType === null) {
            this.deleteAttribute(`${Entry.Attributes.FieldTypePrefix}${property}`);
        } else {
            this.setAttribute(`${Entry.Attributes.FieldTypePrefix}${property}`, valueType);
        }
        return this;
    }

    /**
     * Remove the link from a linked property
     * @param property The linked property
     * @param options Unlink options. `keepValue` (default `true`) keeps the
     *  current linked value as the property's own value, `false` deletes
     *  the property.
     * @returns Self
     */
    unlinkProperty(property: string, options: { keepValue?: boolean } = {}): this {
        const { keepValue = true } = options;
        if (!this.getPropertyLink(property)) return this;
        const value = this.getProperty(property) as string;
        this._deletePropertyLink(property);
        if (keepValue) {
            this._storePropertyLinkCopy(property, value);
        } else {
            this.deleteProperty(property);
        }
        return this;
    }

    _deletePropertyLink(property: string) {
        const attribute = `${Entry.Attributes.PropertyLinkPrefix}${property}`;
        if (typeof this.getAttribute(attribute) === "string") {
            this.deleteAttribute(attribute);
        }
    }

    /**
     * Follow a property's link to the value it shows
     * @returns The linked value, or `null` if the property isn't linked or
     *  the link is broken
     */
    _followPropertyLink(property: string, visited: Set<string> = new Set()): string | null {
        const link = this.getPropertyLink(property);
        if (!link) return null;
        visited.add(`${this.id}:${property}`);
        if (visited.has(`${link.entryID}:${link.property}`)) return null;
        const target = this.vault.findEntryByID(link.entryID);
        if (!target || target.isInTrash()) return null;
        const targetRaw = this.vault.format.getEntryProperties(target._source);
        if (!targetRaw.hasOwnProperty(link.property)) return null;
        // The target may itself be linked: if its link is broken, it shows
        // its own stored value
        const next = target._followPropertyLink(link.property, visited);
        return next !== null ? next : targetRaw[link.property];
    }

    _getLinkedPropertyValues(): PropertyKeyValueObject {
        const raw = this.vault.format.getEntryProperties(this._source);
        const attributes = this.getAttribute() as { [key: string]: string };
        const linkedValues: PropertyKeyValueObject = {};
        for (const attribute of Object.keys(attributes)) {
            if (attribute.indexOf(Entry.Attributes.PropertyLinkPrefix) !== 0) continue;
            const property = attribute.slice(Entry.Attributes.PropertyLinkPrefix.length);
            if (!raw.hasOwnProperty(property)) continue;
            const linkedValue = this._followPropertyLink(property);
            if (linkedValue !== null) {
                linkedValues[property] = linkedValue;
            }
        }
        return linkedValues;
    }

    _getResolvedProperties(): PropertyKeyValueObject {
        return Object.assign(
            {},
            this.vault.format.getEntryProperties(this._source),
            this._getLinkedPropertyValues()
        );
    }

    /**
     * Store a copy of a linked value as the property's own value, for apps
     * that don't support links
     */
    _storePropertyLinkCopy(property: string, value: string) {
        const raw = this.vault.format.getEntryProperties(this._source);
        if (raw[property] !== value) {
            this.vault.format.setEntryProperty(this.id, property, value);
        }
    }

    _updatePropertyLinkCopies() {
        const linkedValues = this._getLinkedPropertyValues();
        for (const property of Object.keys(linkedValues)) {
            this._storePropertyLinkCopy(property, linkedValues[property]);
        }
    }

    _updateRefs() {
        this._source = this.vault.format.findEntryByID(this.id);
    }
}
