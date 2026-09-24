[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / Vault

# Class: Vault

Vault class - Contains Groups and Entrys

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new Vault**(`format?`): `Vault`

Create a new Vault instance

#### Parameters

##### format?

`any` = `...`

Optional vault format specification.
 Will use the default system format (recommended) if not
 specified.

#### Returns

`Vault`

#### Overrides

`EventEmitter.constructor`

## Properties

### Attribute

> `static` **Attribute**: `Readonly`\<\{ `AttachmentsKey`: `"BC_ATTACHMENTS_KEY"`; \}\>

## Accessors

### format

#### Get Signature

> **get** **format**(): `any`

The vault format

##### Returns

`any`

***

### id

#### Get Signature

> **get** **id**(): `string`

The ID of the Vault

##### Returns

`string`

***

### readOnly

#### Get Signature

> **get** **readOnly**(): `boolean`

Whether the Vault is in read-only mode
 or not

##### Returns

`boolean`

## Methods

### createFromHistory()

> `static` **createFromHistory**(`history`, `format?`): `Vault`

Create a new archive instance from a list of commands (history)

#### Parameters

##### history

[`History`](../interfaces/History.md)

The command list

##### format?

`any` = `...`

Optional vault format override

#### Returns

`Vault`

The vault instance

***

### createGroup()

> **createGroup**(`title`): [`Group`](Group.md)

Create a new group

#### Parameters

##### title

`string`

The title for the group

#### Returns

[`Group`](Group.md)

The newly created group

***

### createWithDefaults()

> `static` **createWithDefaults**(`formatOrOptions?`): `Vault`

Create a Vault with the default template: a "General" group and a
"Trash" group

#### Parameters

##### formatOrOptions?

`any` = `...`

Optional vault format override, or options:
 `format` and `groupTitles` (eg. translated group titles)

#### Returns

`Vault`

The new vault

#### Example

```ts
Vault.createWithDefaults({ groupTitles: { general: "Allgemein", trash: "Papierkorb" } });
```

***

### deleteAttribute()

> **deleteAttribute**(`attribute`): `this`

Delete an attribute

#### Parameters

##### attribute

`string`

The name of the attribute to delete

#### Returns

`this`

Self

***

### emptyTrash()

> **emptyTrash**(): `this`

Remove all entries and groups from the trash (permanent)
- does nothing if no trash group

#### Returns

`this`

Self

***

### findEntriesByProperty()

> **findEntriesByProperty**(`property`, `value`): [`Entry`](Entry.md)[]

Find all entries that match a certain property

#### Parameters

##### property

`string` \| `RegExp`

The property to search with

##### value

`string` \| `RegExp`

The value to search for

#### Returns

[`Entry`](Entry.md)[]

An array of found extries

***

### findEntriesByTag()

> **findEntriesByTag**(`tag`, `exact?`): [`Entry`](Entry.md)[]

Find entries by a certain tag

#### Parameters

##### tag

`string`

The case-insensitive tag name

##### exact?

`boolean` = `true`

Whether to match exact tag names or use partial
 matching. Default is true (exact).

#### Returns

[`Entry`](Entry.md)[]

An array of entries

***

### findEntriesByType()

> **findEntriesByType**(`type`): [`Entry`](Entry.md)[]

Find entries of a certain type (eg. logins, credit cards). Entries
without a type set are logins.

#### Parameters

##### type

[`EntryType`](../enumerations/EntryType.md)

The entry type

#### Returns

[`Entry`](Entry.md)[]

An array of entries

***

### findEntryByID()

> **findEntryByID**(`id`): [`Entry`](Entry.md)

Find an entry by its ID

#### Parameters

##### id

`string`

The ID to search for

#### Returns

[`Entry`](Entry.md)

Null if not found, or the Entry instance

***

### findGroupByID()

> **findGroupByID**(`id`): [`Group`](Group.md)

Find a group by its ID

#### Parameters

##### id

`string`

The group ID to search for

#### Returns

[`Group`](Group.md)

The group or null if not found

***

### findGroupsByTitle()

> **findGroupsByTitle**(`title`): [`Group`](Group.md)[]

Find groups by their title

#### Parameters

##### title

`string` \| `RegExp`

The group title

#### Returns

[`Group`](Group.md)[]

An array of groups

***

### getAllEntries()

> **getAllEntries**(): [`Entry`](Entry.md)[]

Get all entries in the vault, including those in Trash

#### Returns

[`Entry`](Entry.md)[]

An array of entry instances

#### See

Group.getAllEntries

***

### getAllEntryTypes()

> **getAllEntryTypes**(): [`EntryType`](../enumerations/EntryType.md)[]

Get the entry types used in the vault, eg. for offering filters
alongside tags. Like `getAllTags`, this includes entries in Trash.

#### Returns

[`EntryType`](../enumerations/EntryType.md)[]

An array of entry types, in `EntryType` order

***

### getAllGroups()

> **getAllGroups**(): [`Group`](Group.md)[]

Get all groups in the vault, including Trash and the groups in it

#### Returns

[`Group`](Group.md)[]

An array of group instances

#### See

Group.getAllGroups

***

### getAllTags()

> **getAllTags**(): `string`[]

Get all registered entry tags

#### Returns

`string`[]

An array of tag strings

***

### getAttribute()

> **getAttribute**(`attributeName?`): `string` \| `Object`

Get the value of an attribute

#### Parameters

##### attributeName?

`string`

The attribute to get

#### Returns

`string` \| `Object`

The value of the attribute or undefined if not
 set. Returns an object if no attribute name is given.

***

### getGroups()

> **getGroups**(): [`Group`](Group.md)[]

Get the top-level groups in the vault

#### Returns

[`Group`](Group.md)[]

***

### getTrashGroup()

> **getTrashGroup**(): [`Group`](Group.md)

Get the trash group

#### Returns

[`Group`](Group.md)

The trash group or null if it doesn't
 exist

***

### setAttribute()

> **setAttribute**(`attribute`, `value`): `this`

Set an attribute on the vault

#### Parameters

##### attribute

`string`

The attribute to set

##### value

`string`

The value to set for the attribute

#### Returns

`this`

Self
