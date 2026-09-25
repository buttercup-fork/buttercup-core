import { VaultItem } from "./VaultItem.js";
import { generateUUID } from "../tools/uuid.js";
import { getEntryURLs, EntryURLType } from "../tools/entry.js";
import { Group } from "./Group.js";
import { Vault } from "./Vault.js";
import { isValidTag } from "../tools/tag.js";
import {
    EntryChange,
    EntryID,
    EntryLoginLink,
    EntryPropertyLink,
    EntryPropertyValueType,
    EntryRecoveryCode,
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
        FieldOrderPrefix: "BC_ENTRY_FIELD_ORDER:",
        FieldTypePrefix: "BC_ENTRY_FIELD_TYPE:",
        LoginEntry: "BC_ENTRY_LOGIN_ENTRY",
        PasswordChanged: "BC_ENTRY_PASSWORD_CHANGED",
        PasswordExpiry: "BC_ENTRY_PASSWORD_EXPIRY",
        PropertyLinkPrefix: "BC_ENTRY_PROPERTY_LINK:",
        RecoveryCodesPrefix: "BC_ENTRY_RECOVERY_CODES:",
        SingleUsePasswords: "BC_ENTRY_SINGLE_USE_PASSWORDS",
        Tags: "BC_ENTRY_TAGS"
    });

    /**
     * The property holding the queued single-use passwords, after the
     * current one in the password property
     * @see Entry.setSingleUsePasswords
     */
    static SingleUsePasswordsProperty = "Single-use passwords";

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
        return vault.findEntryByID(id)!;
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
        this._deleteRecoveryCodesMarker(property);
        const orderAttribute = `${Entry.Attributes.FieldOrderPrefix}${property}`;
        if (typeof this.getAttribute(orderAttribute) === "string") {
            this.deleteAttribute(orderAttribute);
        }
        return this;
    }

    /**
     * Get all attributes
     * @returns An object containing all attribute keys and their values
     */
    getAttribute(): PropertyKeyValueObject;
    /**
     * Get an attribute
     * @param attribute The name of the attribute to fetch
     * @returns The attribute value, or undefined if not set
     */
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
        return this.vault._groups.find((group) => group.id === parentID)!;
    }

    /**
     * Get all property values
     * @returns An object with all properties and their values
     */
    getProperty(): PropertyKeyValueObject;
    /**
     * Get a property value
     * @param property The name of the property to fetch
     * @returns The property value, or undefined if not set
     */
    getProperty(property: string): string | undefined;
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
     * Get the entry used to sign in to this entry's account
     * @returns The entry, or `null` if none is set or the link is broken
     *  (the entry is in Trash or was deleted)
     * @see Entry.setLoginEntry
     */
    getLoginEntry(): Entry | null {
        const link = this.getLoginEntryLink();
        if (!link) return null;
        const target = this.vault.findEntryByID(link.entryID);
        return target && !target.isInTrash() ? target : null;
    }

    /**
     * Get the stored link to the entry used to sign in to this entry's
     * account, even if the link is broken
     * @returns The linked entry's ID and its title when last in sync, or
     *  `null` if none is set
     * @see Entry.setLoginEntry
     */
    getLoginEntryLink(): EntryLoginLink | null {
        const value = this.getAttribute(Entry.Attributes.LoginEntry);
        if (typeof value !== "string") return null;
        // Entry IDs contain no colons, titles may
        const separator = value.indexOf(":");
        const entryID = separator >= 0 ? value.slice(0, separator) : value;
        if (!entryID) return null;
        return {
            entryID,
            title: separator >= 0 ? value.slice(separator + 1) : ""
        };
    }

    /**
     * Get when the entry's password was last changed
     * Recorded whenever the password property is set to a new value. For a
     * password linked to another entry's password, it's when that one was
     * last changed.
     * @returns A UTC timestamp in milliseconds, or `null` if not known (eg.
     *  the password was last changed before this was recorded)
     */
    getPasswordChangedTime(): number | null {
        return this._getPasswordChangedTime(new Set());
    }

    /**
     * Get the password expiry period
     * @returns The number of days after a password change that the password
     *  expires, or `null` if it doesn't expire
     * @see Entry.setPasswordExpiry
     */
    getPasswordExpiry(): number | null {
        const value = this.getAttribute(Entry.Attributes.PasswordExpiry);
        const days = typeof value === "string" && /^\d+$/.test(value) ? parseInt(value, 10) : 0;
        return days > 0 ? days : null;
    }

    /**
     * Get when the entry's password expires
     * @returns A UTC timestamp in milliseconds, or `null` if the password
     *  doesn't expire or its last change isn't known
     */
    getPasswordExpiryTime(): number | null {
        const days = this.getPasswordExpiry();
        const changed = this.getPasswordChangedTime();
        if (days === null || changed === null) return null;
        return changed + days * DAY_MS;
    }

    /**
     * Get the display order of a property
     * @param property The property name
     * @returns The 0-based order, or `Infinity` if the property has no order
     *  (it's then shown after the ordered properties)
     * @see Entry.setPropertyOrder
     */
    getPropertyOrder(property: string): number {
        const value = this.getAttribute(`${Entry.Attributes.FieldOrderPrefix}${property}`);
        const order = typeof value === "string" && /^\d+$/.test(value) ? parseInt(value, 10) : NaN;
        return isNaN(order) ? Infinity : order;
    }

    /**
     * Get all property names in display order
     * Properties without an order follow the ordered ones, in the order
     * they're stored.
     * @returns An array of property names
     * @see Entry.setPropertyOrder
     */
    getPropertyOrders(): Array<string> {
        return Object.keys(this.getProperty())
            .map((property, index) => ({ property, index, order: this.getPropertyOrder(property) }))
            .sort((a, b) => (a.order === b.order ? a.index - b.index : a.order < b.order ? -1 : 1))
            .map((item) => item.property);
    }

    /**
     * Get the single-use passwords of the entry
     * @returns The current password followed by the queued ones, or `null`
     *  if the entry doesn't use single-use passwords
     * @see Entry.setSingleUsePasswords
     */
    getSingleUsePasswords(): Array<string> | null {
        if (!this.hasSingleUsePasswords()) return null;
        const current = this.getProperty("password");
        return [
            ...(typeof current === "string" && current.length > 0 ? [current] : []),
            ...parseSingleUsePasswords(
                (this.getProperty(Entry.SingleUsePasswordsProperty) as string) || ""
            )
        ];
    }

    /**
     * Get the codes of a recovery codes property
     * @param property The property name
     * @returns The codes in their stored order, each with whether it was
     *  marked as used, or `null` if the property isn't a recovery codes
     *  property
     * @see Entry.setRecoveryCodes
     */
    getRecoveryCodes(property: string): Array<EntryRecoveryCode> | null {
        if (!this.isRecoveryCodesProperty(property)) return null;
        const used = this._getUsedRecoveryCodes(property);
        return parseRecoveryCodes(this.getProperty(property) as string).map((code) => ({
            code,
            used: used.includes(code)
        }));
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
            ? tags.split(",").reduce((output: Array<string>, tag) => {
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
     * Check if the entry's password has expired
     * @param at The time to check at, as a UTC timestamp in milliseconds.
     *  Defaults to now. Pass a later time to find passwords that expire soon.
     * @returns True if the password has an expiry period and has expired
     * @see Entry.setPasswordExpiry
     */
    hasExpiredPassword(at: number = Date.now()): boolean {
        const expires = this.getPasswordExpiryTime();
        return expires !== null && expires <= at;
    }

    /**
     * Check if any of the entry's properties has a display order
     * @returns True if the properties were ordered with
     *  {@link Entry.setPropertyOrder} or {@link Entry.setPropertyOrders}
     */
    hasPropertyOrders(): boolean {
        const properties = this.getProperty();
        return Object.keys(properties).some(
            (property) => this.getPropertyOrder(property) !== Infinity
        );
    }

    /**
     * Check if the entry uses single-use passwords
     * @returns True if set up with {@link Entry.setSingleUsePasswords}
     */
    hasSingleUsePasswords(): boolean {
        return typeof this.getAttribute(Entry.Attributes.SingleUsePasswords) === "string";
    }

    /**
     * Check if the link to the entry used to sign in is broken
     * A link is broken when the linked entry is in Trash or was deleted.
     * @returns True if a sign-in entry is set and the link is broken
     */
    isLoginEntryBroken(): boolean {
        return !!this.getLoginEntryLink() && this.getLoginEntry() === null;
    }

    /**
     * Check if a property holds recovery codes
     * @param property The property name
     * @returns True if the property was made a recovery codes property with
     *  {@link Entry.setRecoveryCodes} and is still a password field
     */
    isRecoveryCodesProperty(property: string): boolean {
        return (
            typeof this.getAttribute(`${Entry.Attributes.RecoveryCodesPrefix}${property}`) ===
                "string" &&
            typeof this.getProperty(property) === "string" &&
            this.getPropertyValueType(property) === EntryPropertyValueType.Password
        );
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
        let linkedEntry: Entry | null = target,
            linkedProperty: string | null = targetProperty;
        const visited = new Set<string>();
        while (linkedEntry) {
            const key = `${linkedEntry.id}:${linkedProperty}`;
            if ((linkedEntry.id === this.id && linkedProperty === property) || visited.has(key)) {
                throw new Error("Cannot link property: Link would create a loop");
            }
            visited.add(key);
            const link = linkedEntry.getPropertyLink(linkedProperty!);
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
     * Mark a recovery code as used, or as unused again
     * @param property The recovery codes property
     * @param code The code, as returned by {@link Entry.getRecoveryCodes}
     * @param used Whether the code is used (default) or not
     * @returns Self
     * @throws {Error} Throws if the property isn't a recovery codes property
     *  or doesn't contain the code
     */
    markRecoveryCodeUsed(property: string, code: string, used: boolean = true): this {
        const codes = this.getRecoveryCodes(property);
        if (!codes) {
            throw new Error(
                `Cannot mark recovery code: Not a recovery codes property: ${property}`
            );
        }
        const target = code.trim();
        if (!codes.some((item) => item.code === target)) {
            throw new Error("Cannot mark recovery code: Code not found");
        }
        const usedCodes = codes
            .filter((item) => (item.code === target ? used : item.used))
            .map((item) => item.code);
        this._setUsedRecoveryCodes(property, usedCodes);
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
     * Set the entry used to sign in to this entry's account, eg. a site you
     * sign in to with your Google account links to your Google entry
     * The link and a copy of the linked entry's title are stored in a
     * `BC_ENTRY_LOGIN_ENTRY` attribute. The title is refreshed when the
     * vault is saved, so a broken link can still name the entry.
     * @param target The entry, in the same vault, or `null` to remove the
     *  link
     * @returns Self
     * @throws {Error} Throws if the target is this entry, in another vault or
     *  in Trash, or signs in with this entry itself
     */
    setLoginEntry(target: Entry | null): this {
        if (target === null) {
            if (typeof this.getAttribute(Entry.Attributes.LoginEntry) === "string") {
                this.deleteAttribute(Entry.Attributes.LoginEntry);
            }
            return this;
        }
        if (target.vault !== this.vault) {
            throw new Error("Cannot set login entry: Target entry is in another vault");
        }
        if (target.id === this.id) {
            throw new Error("Cannot set login entry: Entry cannot sign in with itself");
        }
        if (target.isInTrash()) {
            throw new Error("Cannot set login entry: Target entry is in Trash");
        }
        // Walk the target's sign-in entries, checking they don't lead back here
        const visited = new Set<string>();
        let current: Entry | null = target;
        while (current && !visited.has(current.id)) {
            if (current.id === this.id) {
                throw new Error("Cannot set login entry: Link would create a loop");
            }
            visited.add(current.id);
            const link = current.getLoginEntryLink();
            current = link ? this.vault.findEntryByID(link.entryID) : null;
        }
        this._storeLoginEntryLink(target);
        return this;
    }

    /**
     * Set how long the entry's password stays valid after it's changed
     * The password expires the given number of days after it was last
     * changed, and changing it starts the period again. If the last change
     * isn't known (eg. it was before this was recorded), the period starts
     * now.
     * @param days The number of days (a whole number of at least 1), or
     *  `null` to stop the password expiring
     * @returns Self
     * @throws {Error} Throws if the number of days isn't valid
     */
    setPasswordExpiry(days: number | null): this {
        if (days === null) {
            if (typeof this.getAttribute(Entry.Attributes.PasswordExpiry) === "string") {
                this.deleteAttribute(Entry.Attributes.PasswordExpiry);
            }
            return this;
        }
        if (typeof days !== "number" || !Number.isInteger(days) || days < 1) {
            throw new Error(`Cannot set password expiry: Invalid number of days: ${days}`);
        }
        this.setAttribute(Entry.Attributes.PasswordExpiry, `${days}`);
        if (this._getOwnPasswordChangedTime() === null) {
            this.setAttribute(Entry.Attributes.PasswordChanged, `${Date.now()}`);
        }
        return this;
    }

    /**
     * Set a property on the entry
     * @param property The property name
     * @param value The property value
     * @returns Returns self
     */
    setProperty(property: string, value: string): this {
        const passwordChanged =
            property === "password" &&
            this.vault.format.getEntryProperties(this._source)[property] !== value;
        // Setting a linked property replaces the link with its own value
        this._deletePropertyLink(property);
        this.vault.format.setEntryProperty(this.id, property, value);
        if (passwordChanged) {
            this.setAttribute(Entry.Attributes.PasswordChanged, `${Date.now()}`);
        }
        return this;
    }

    /**
     * Move a property to a position in the display order
     * The properties at and after the position move down by one. All
     * properties are given an order, starting from 0, so properties that
     * had none keep their current place.
     * @param property The property to move
     * @param order The 0-based position. `Infinity`, or any position past
     *  the last property, moves it to the end.
     * @returns Self
     * @throws {Error} Throws if the entry has no such property
     */
    setPropertyOrder(property: string, order: number): this {
        const properties = this.getPropertyOrders();
        if (!properties.includes(property)) {
            throw new Error(`Cannot set property order: No such property: ${property}`);
        }
        if (typeof order !== "number" || isNaN(order)) {
            throw new Error(`Cannot set property order: Invalid order: ${order}`);
        }
        const others = properties.filter((name) => name !== property);
        const index = Math.min(Math.max(Math.floor(order), 0), others.length);
        others.splice(index, 0, property);
        this._writePropertyOrders(others);
        return this;
    }

    /**
     * Set the display order of the properties, eg. after reordering them by
     * drag and drop
     * @param properties Property names in their new order. Properties that
     *  aren't listed follow them, in their current order.
     * @returns Self
     * @throws {Error} Throws if a listed property doesn't exist on the entry
     *  or is listed twice
     */
    setPropertyOrders(properties: Array<string>): this {
        const current = this.getPropertyOrders();
        properties.forEach((property, index) => {
            if (!current.includes(property)) {
                throw new Error(`Cannot set property orders: No such property: ${property}`);
            }
            if (properties.indexOf(property) !== index) {
                throw new Error(`Cannot set property orders: Property listed twice: ${property}`);
            }
        });
        this._writePropertyOrders([
            ...properties,
            ...current.filter((property) => !properties.includes(property))
        ]);
        return this;
    }

    /**
     * Use a list of single-use passwords for the entry, used in order
     * The first password goes in the password property, and the rest are
     * queued one per line in the {@link Entry.SingleUsePasswordsProperty}
     * property (a password field, so apps hide it). Use
     * {@link Entry.popSingleUsePassword} once the current password was used.
     * @param passwords The passwords, in the order they are to be used.
     *  Empty passwords are dropped.
     * @returns Self
     * @throws {Error} Throws if there are no passwords or a password contains
     *  a line break
     */
    setSingleUsePasswords(passwords: Array<string>): this {
        const list = passwords.filter((password) => password.length > 0);
        if (list.length === 0) {
            throw new Error("Cannot set single-use passwords: No passwords provided");
        }
        if (list.some((password) => /[\r\n]/.test(password))) {
            throw new Error("Cannot set single-use passwords: A password contains a line break");
        }
        const [first, ...queued] = list;
        if (this.getProperty("password") !== first || this.getPropertyLink("password")) {
            this.setProperty("password", first);
        }
        this._setSingleUsePasswordQueue(queued);
        if (!this.hasSingleUsePasswords()) {
            this.setAttribute(Entry.Attributes.SingleUsePasswords, "1");
        }
        return this;
    }

    /**
     * Make a property hold a list of recovery codes (eg. 2FA backup codes)
     * The codes are stored one per line in the property's value, and the
     * property becomes a password field, so apps without recovery codes
     * support still hide it. Which codes are used is stored in a
     * `BC_ENTRY_RECOVERY_CODES:<property>` attribute.
     * @param property The property name
     * @param codes The codes. If omitted, the property's current value is
     *  used, one code per line. Surrounding whitespace and empty lines are
     *  dropped.
     * @returns Self
     * @throws {Error} Throws if there are no codes, or a code contains a line
     *  break
     */
    setRecoveryCodes(property: string, codes?: Array<string>): this {
        let newCodes: Array<string>;
        if (typeof codes === "undefined") {
            newCodes = parseRecoveryCodes((this.getProperty(property) as string) || "");
        } else {
            newCodes = codes.map((code) => code.trim()).filter((code) => code.length > 0);
            if (newCodes.some((code) => /[\r\n]/.test(code))) {
                throw new Error("Cannot set recovery codes: A code contains a line break");
            }
        }
        if (newCodes.length === 0) {
            throw new Error("Cannot set recovery codes: No codes provided");
        }
        const usedCodes = this._getUsedRecoveryCodes(property).filter((code) =>
            newCodes.includes(code)
        );
        const value = newCodes.join("\n");
        if (this.getProperty(property) !== value || this.getPropertyLink(property)) {
            this.setProperty(property, value);
        }
        this.setPropertyValueType(property, EntryPropertyValueType.Password);
        this._setUsedRecoveryCodes(property, usedCodes);
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
     * Discard the current single-use password and move the next queued one
     * into the password property
     * When the last password is used, the password property is left empty
     * and the entry keeps using single-use passwords, so more can be added.
     * The used password stays in the entry's history.
     * @returns The new current password, or `null` if none are left
     * @throws {Error} Throws if the entry doesn't use single-use passwords
     */
    popSingleUsePassword(): string | null {
        if (!this.hasSingleUsePasswords()) {
            throw new Error("Cannot pop password: Entry doesn't use single-use passwords");
        }
        const [next = null, ...queued] = parseSingleUsePasswords(
            (this.getProperty(Entry.SingleUsePasswordsProperty) as string) || ""
        );
        this.setProperty("password", next === null ? "" : next);
        this._setSingleUsePasswordQueue(queued);
        return next;
    }

    /**
     * Remove the display order of all properties
     * @returns Self
     */
    resetPropertyOrders(): this {
        Object.keys(this.getAttribute()).forEach((attribute) => {
            if (attribute.indexOf(Entry.Attributes.FieldOrderPrefix) === 0) {
                this.deleteAttribute(attribute);
            }
        });
        return this;
    }

    /**
     * Stop using single-use passwords
     * The current password stays, and the queued ones are removed.
     * @returns Self
     */
    unsetSingleUsePasswords(): this {
        if (typeof this.getProperty(Entry.SingleUsePasswordsProperty) === "string") {
            this.deleteProperty(Entry.SingleUsePasswordsProperty);
        }
        if (this.hasSingleUsePasswords()) {
            this.deleteAttribute(Entry.Attributes.SingleUsePasswords);
        }
        return this;
    }

    /**
     * Turn a recovery codes property back into a plain password field
     * The codes stay in the property's value, and which were used is
     * forgotten.
     * @param property The property name
     * @returns Self
     */
    unsetRecoveryCodes(property: string): this {
        this._deleteRecoveryCodesMarker(property);
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

    _deleteRecoveryCodesMarker(property: string) {
        const attribute = `${Entry.Attributes.RecoveryCodesPrefix}${property}`;
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
        const loginEntry = this.getLoginEntry();
        if (loginEntry) {
            this._storeLoginEntryLink(loginEntry);
        }
    }

    _storeLoginEntryLink(target: Entry) {
        const title = target.getProperty("title");
        const value = `${target.id}:${typeof title === "string" ? title : ""}`;
        if (this.getAttribute(Entry.Attributes.LoginEntry) !== value) {
            this.setAttribute(Entry.Attributes.LoginEntry, value);
        }
    }

    _getOwnPasswordChangedTime(): number | null {
        const value = this.getAttribute(Entry.Attributes.PasswordChanged);
        return typeof value === "string" && /^\d+$/.test(value) ? parseInt(value, 10) : null;
    }

    _getPasswordChangedTime(visited: Set<string>): number | null {
        const link = this.getPropertyLink("password");
        if (link && link.property === "password" && !visited.has(this.id)) {
            visited.add(this.id);
            const target = this.vault.findEntryByID(link.entryID);
            if (target && !target.isInTrash()) {
                const changed = target._getPasswordChangedTime(visited);
                if (changed !== null) return changed;
            }
        }
        return this._getOwnPasswordChangedTime();
    }

    _getUsedRecoveryCodes(property: string): Array<string> {
        const value = this.getAttribute(`${Entry.Attributes.RecoveryCodesPrefix}${property}`);
        if (typeof value !== "string") return [];
        try {
            const used = JSON.parse(value);
            return Array.isArray(used) ? used.filter((code) => typeof code === "string") : [];
        } catch (err) {
            return [];
        }
    }

    _setUsedRecoveryCodes(property: string, codes: Array<string>) {
        const attribute = `${Entry.Attributes.RecoveryCodesPrefix}${property}`;
        const value = JSON.stringify(codes);
        if (this.getAttribute(attribute) !== value) {
            this.setAttribute(attribute, value);
        }
    }

    _setSingleUsePasswordQueue(passwords: Array<string>) {
        const property = Entry.SingleUsePasswordsProperty;
        if (passwords.length === 0) {
            if (typeof this.getProperty(property) === "string") {
                this.deleteProperty(property);
            }
            return;
        }
        const value = passwords.join("\n");
        if (this.getProperty(property) !== value || this.getPropertyLink(property)) {
            this.setProperty(property, value);
        }
        if (this.getPropertyValueType(property) !== EntryPropertyValueType.Password) {
            this.setPropertyValueType(property, EntryPropertyValueType.Password);
        }
    }

    _updateRefs() {
        this._source = this.vault.format.findEntryByID(this.id);
    }

    _writePropertyOrders(properties: Array<string>) {
        properties.forEach((property, index) => {
            const attribute = `${Entry.Attributes.FieldOrderPrefix}${property}`;
            if (this.getAttribute(attribute) !== `${index}`) {
                this.setAttribute(attribute, `${index}`);
            }
        });
    }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Split a queued single-use passwords value into its passwords: one per
 * line, without empty lines. Passwords aren't trimmed.
 */
function parseSingleUsePasswords(value: string): Array<string> {
    return value.split(/\r?\n/).filter((password) => password.length > 0);
}

/**
 * Split a recovery codes value into its codes: one per line, trimmed,
 * without empty lines
 */
function parseRecoveryCodes(value: string): Array<string> {
    return value
        .split(/\r?\n/)
        .map((code) => code.trim())
        .filter((code) => code.length > 0);
}
