[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / Group

# Class: Group

Group class - contains Entrys

## Extends

- `VaultItem`

## Constructors

### Constructor

> **new Group**(`vault`, `source`): `Group`

Constructor for the vault member base class

#### Parameters

##### vault

[`Vault`](Vault.md)

Vault reference

##### source

`any`

Remote source object reference

#### Returns

`Group`

#### Inherited from

`VaultItem.constructor`

## Properties

### Attribute

> `static` **Attribute**: `Readonly`\<\{ `Role`: `"bc_group_role"`; \}\>

## Accessors

### id

#### Get Signature

> **get** **id**(): `string`

The ID of the entry or group

##### Returns

`string`

#### Inherited from

`VaultItem.id`

***

### permissions

#### Get Signature

> **get** **permissions**(): `string`[]

The current granted permissions

##### Returns

`string`[]

#### Inherited from

`VaultItem.permissions`

***

### vault

#### Get Signature

> **get** **vault**(): [`Vault`](Vault.md)

The vault this item belongs to

##### Returns

[`Vault`](Vault.md)

#### Inherited from

`VaultItem.vault`

## Methods

### createEntry()

> **createEntry**(`title?`): [`Entry`](Entry.md)

Create a new entry with a title

#### Parameters

##### title?

`string`

The title of the new entry

#### Returns

[`Entry`](Entry.md)

The new entry

***

### createGroup()

> **createGroup**(`title?`): `Group`

Create a child group

#### Parameters

##### title?

`string`

Optionally set a title

#### Returns

`Group`

The new child group

***

### createNew()

> `static` **createNew**(`vault`, `parentID?`, `id?`): `Group`

Create a new Group instance within a vault and maybe a group

#### Parameters

##### vault

[`Vault`](Vault.md)

The vault to add the group to

##### parentID?

`string` = `"0"`

Optional parent group ID. If no
 value is specified the group is added to the root of the
 vault.

##### id?

`string` = `...`

#### Returns

`Group`

***

### delete()

> **delete**(`skipTrash?`): `boolean`

Delete the group
If there is a trash group available, the group is moved there. If the group
is already in the trash, it is deleted permanently.

#### Parameters

##### skipTrash?

`boolean` = `false`

Skip the trash

#### Returns

`boolean`

True when deleted, false when moved to trash

***

### deleteAttribute()

> **deleteAttribute**(`attr`): `this`

Delete an attribute

#### Parameters

##### attr

`string`

The name of the attribute

#### Returns

`this`

Returns self

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

> **findGroupByID**(`id`): `Group`

Find a group by its ID

#### Parameters

##### id

`string`

The group ID to search for

#### Returns

`Group`

The group or null if not found

***

### findGroupsByTitle()

> **findGroupsByTitle**(`title`): `Group`[]

Find groups by their title

#### Parameters

##### title

`string` \| `RegExp`

The group title

#### Returns

`Group`[]

An array of groups

***

### getAttribute()

> **getAttribute**(`attribute?`): `string` \| `Object`

Get an attribute

#### Parameters

##### attribute?

`string`

The name of the attribute. If none provided
 the entire attributes object is returned.

#### Returns

`string` \| `Object`

Returns the attribute or undefined if not found.
 If no attribute name is provided an object containing all attributes is returned.

***

### getEntries()

> **getEntries**(): [`Entry`](Entry.md)[]

Get the entries within the group

#### Returns

[`Entry`](Entry.md)[]

An array of entries

***

### getGroups()

> **getGroups**(): `Group`[]

Get the groups within the group

#### Returns

`Group`[]

An array of child groups

***

### getParentGroup()

> **getParentGroup**(): `Group`

Get the parent group

#### Returns

`Group`

Returns the parent group instance or null if the parent
 is the archive

#### Throws

Throws if no parent could be found (detached)

***

### getTitle()

> **getTitle**(): `string`

Get the group title

#### Returns

`string`

The title of the group

***

### grantPermission()

> **grantPermission**(`perm`): `void`

Grant a new permission to the member

#### Parameters

##### perm

`string`

The permission to grant

#### Returns

`void`

#### Inherited from

`VaultItem.grantPermission`

***

### hasPermission()

> **hasPermission**(`perm`): `boolean`

Check if the member has a permission

#### Parameters

##### perm

`string`

The permission to check for

#### Returns

`boolean`

#### Inherited from

`VaultItem.hasPermission`

***

### isInTrash()

> **isInTrash**(): `boolean`

Check if the group is in the trash

#### Returns

`boolean`

Whether or not the group is within the trash group

***

### isTrash()

> **isTrash**(): `boolean`

Check if the group is used for trash

#### Returns

`boolean`

Whether or not the group is the trash group

***

### moveTo()

> **moveTo**(`target`): `this`

Move the group to another group or archive

#### Parameters

##### target

[`Vault`](Vault.md) \| `Group`

The destination Group or Vault instance

#### Returns

`this`

Self

***

### revokeAllPermissions()

> **revokeAllPermissions**(): `void`

Revoke all permissions

#### Returns

`void`

#### Inherited from

`VaultItem.revokeAllPermissions`

***

### revokePermission()

> **revokePermission**(`perm`): `void`

Revoke a single permission

#### Parameters

##### perm

`string`

The permission to revoke

#### Returns

`void`

#### Inherited from

`VaultItem.revokePermission`

***

### setAttribute()

> **setAttribute**(`attribute`, `value`): `this`

Set an attribute

#### Parameters

##### attribute

`string`

The name of the attribute

##### value

`string`

The value to set

#### Returns

`this`

Returns self

***

### setTitle()

> **setTitle**(`title`): `this`

Set the group title

#### Parameters

##### title

`string`

The title of the group

#### Returns

`this`

Returns self
