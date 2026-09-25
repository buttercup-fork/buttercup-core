[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / Entry

# Class: Entry

Entry class - some secret item, login or perhaps
even a credit card

## Extends

- `VaultItem`

## Constructors

### Constructor

> **new Entry**(`vault`, `source`): `Entry`

Constructor for the vault member base class

#### Parameters

##### vault

[`Vault`](Vault.md)

Vault reference

##### source

`any`

Remote source object reference

#### Returns

`Entry`

#### Inherited from

`VaultItem.constructor`

## Properties

### Attributes

> `static` **Attributes**: `Readonly`\<\{ `AttachmentPrefix`: `"BC_ENTRY_ATTACHMENT:"`; `FacadeType`: `"BC_ENTRY_FACADE_TYPE"`; `FieldOrderPrefix`: `"BC_ENTRY_FIELD_ORDER:"`; `FieldTypePrefix`: `"BC_ENTRY_FIELD_TYPE:"`; `PropertyLinkPrefix`: `"BC_ENTRY_PROPERTY_LINK:"`; `RecoveryCodesPrefix`: `"BC_ENTRY_RECOVERY_CODES:"`; `SingleUsePasswords`: `"BC_ENTRY_SINGLE_USE_PASSWORDS"`; `Tags`: `"BC_ENTRY_TAGS"`; \}\>

***

### SingleUsePasswordsProperty

> `static` **SingleUsePasswordsProperty**: `string` = `"Single-use passwords"`

The property holding the queued single-use passwords, after the
current one in the password property

#### See

Entry.setSingleUsePasswords

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

### addTags()

> **addTags**(...`tags`): `this`

Add one or more tags to the entry

#### Parameters

##### tags

...`string`[]

A collection of tag strings

#### Returns

`this`

Self

***

### createNew()

> `static` **createNew**(`vault`, `parentGroupID`): `Entry`

Create a new Entry instance within a vault
 and group

#### Parameters

##### vault

[`Vault`](Vault.md)

The target vault instance

##### parentGroupID

`string`

The target group to
 create the entry in (cannot be vault-level)

#### Returns

`Entry`

***

### delete()

> **delete**(`skipTrash?`): `boolean`

Delete the entry - either trashes the entry, or removes it completely.
If the entry is in the trash already, it is removed (including if there is no
   trash group). If the entry is in a normal group and a trash group exists, it
 is moved there instead of being deleted.

#### Parameters

##### skipTrash?

`boolean` = `false`

Skip the trash and force-delete the entry

#### Returns

`boolean`

Whether or not the item was deleted

#### See

 - moveToGroup
 - Vault.getTrashGroup

***

### deleteAttribute()

> **deleteAttribute**(`attribute`): `this`

Delete an attribute

#### Parameters

##### attribute

`string`

The attribute name

#### Returns

`this`

Self

#### Throws

Throws if the attribute doesn't exist, or cannot be deleted

***

### deleteProperty()

> **deleteProperty**(`property`): `this`

Delete a property

#### Parameters

##### property

`string`

The property to delete

#### Returns

`this`

Self

#### Throws

Throws if property doesn't exist, or cannot be deleted

***

### getAttribute()

#### Call Signature

> **getAttribute**(): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

Get an attribute
If no attribute name is specified, an object with all attributes and their
values is returned.

##### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

The attribute value or an object
 containing all attribute keys and their values if no attribute name
 is provided

#### Call Signature

> **getAttribute**(`attribute`): `string`

Get an attribute
If no attribute name is specified, an object with all attributes and their
values is returned.

##### Parameters

###### attribute

`string`

The name of the attribute to fetch

##### Returns

`string`

The attribute value or an object
 containing all attribute keys and their values if no attribute name
 is provided

***

### getChanges()

> **getChanges**(): [`EntryChange`](../interfaces/EntryChange.md)[]

Get an array of all history changes made to the entry

#### Returns

[`EntryChange`](../interfaces/EntryChange.md)[]

***

### getGroup()

> **getGroup**(): [`Group`](Group.md)

Get the containing group for the entry

#### Returns

[`Group`](Group.md)

The parent group

#### Throws

Throws if no parent group found

***

### getProperties()

> **getProperties**(`propertyExpression?`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

Get property values via RegExp expressions.
If no property expression is specified, it returns the empty behavior of
Entry.getProperty.

#### Parameters

##### propertyExpression?

`string` \| `RegExp`

The expression to use to fetch properties. If
 a regular expression, it is then tested against all property keys. If a
 string, it's compared exactly.

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

A key-value object of the matching properties

***

### getProperty()

> **getProperty**(`property?`): `string` \| [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

Get a property value
If no property name is specified, an object with all properties and their
values is returned.

#### Parameters

##### property?

`string`

The name of the property to fetch

#### Returns

`string` \| [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

The property value or an object with all
 values if no property specified

***

### getPropertyLink()

> **getPropertyLink**(`property`): [`EntryPropertyLink`](../interfaces/EntryPropertyLink.md)

Get the link of a linked property
A linked property shows the current value of a property on another
entry (see [Entry.linkProperty](#linkproperty)).

#### Parameters

##### property

`string`

The property name

#### Returns

[`EntryPropertyLink`](../interfaces/EntryPropertyLink.md)

The linked entry ID and property, or `null` if the property
 isn't linked

***

### getPropertyOrder()

> **getPropertyOrder**(`property`): `number`

Get the display order of a property

#### Parameters

##### property

`string`

The property name

#### Returns

`number`

The 0-based order, or `Infinity` if the property has no order
 (it's then shown after the ordered properties)

#### See

Entry.setPropertyOrder

***

### getPropertyOrders()

> **getPropertyOrders**(): `string`[]

Get all property names in display order
Properties without an order follow the ordered ones, in the order
they're stored.

#### Returns

`string`[]

An array of property names

#### See

Entry.setPropertyOrder

***

### getPropertyValueType()

> **getPropertyValueType**(`property`): [`EntryPropertyValueType`](../enumerations/EntryPropertyValueType.md)

Set the value type of an entry property

#### Parameters

##### property

`string`

The property to get the value type of

#### Returns

[`EntryPropertyValueType`](../enumerations/EntryPropertyValueType.md)

The property value type

***

### getRecoveryCodes()

> **getRecoveryCodes**(`property`): [`EntryRecoveryCode`](../interfaces/EntryRecoveryCode.md)[]

Get the codes of a recovery codes property

#### Parameters

##### property

`string`

The property name

#### Returns

[`EntryRecoveryCode`](../interfaces/EntryRecoveryCode.md)[]

The codes in their stored order, each with whether it was
 marked as used, or `null` if the property isn't a recovery codes
 property

#### See

Entry.setRecoveryCodes

***

### getSingleUsePasswords()

> **getSingleUsePasswords**(): `string`[]

Get the single-use passwords of the entry

#### Returns

`string`[]

The current password followed by the queued ones, or `null`
 if the entry doesn't use single-use passwords

#### See

Entry.setSingleUsePasswords

***

### getTags()

> **getTags**(): `string`[]

Get entry tags

#### Returns

`string`[]

An array of tag strings

***

### getType()

> **getType**(): [`EntryType`](../enumerations/EntryType.md)

Get the entry type

#### Returns

[`EntryType`](../enumerations/EntryType.md)

The entry type

***

### getURLs()

> **getURLs**(`urlTypePreference`): `string`[]

Get an array of URLs from the Entry
Returns an array of detected URL values in the Entry's properties. The
types of URLs can be configured by providing a preference:
 - "general" - General URLs (of any type, preferring "URL" named props)
 - "login" - Prefer URLs whose key has "login" in it
 - "icon" - Return only icon-like URLs
 - "any" - Return all found URLs

#### Parameters

##### urlTypePreference

[`EntryURLType`](../enumerations/EntryURLType.md)

The URL type preference

#### Returns

`string`[]

An array of URLs

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

### hasPropertyOrders()

> **hasPropertyOrders**(): `boolean`

Check if any of the entry's properties has a display order

#### Returns

`boolean`

True if the properties were ordered with
 [Entry.setPropertyOrder](#setpropertyorder) or [Entry.setPropertyOrders](#setpropertyorders)

***

### hasSingleUsePasswords()

> **hasSingleUsePasswords**(): `boolean`

Check if the entry uses single-use passwords

#### Returns

`boolean`

True if set up with [Entry.setSingleUsePasswords](#setsingleusepasswords)

***

### isInTrash()

> **isInTrash**(): `boolean`

Check if the entry is in the trash

#### Returns

`boolean`

Whether or not the entry is in the trash

***

### isPropertyLinkBroken()

> **isPropertyLinkBroken**(`property`): `boolean`

Check if a linked property's link is broken
A link is broken when the linked entry was deleted or is in Trash, or
no longer has the linked property. A broken link shows the value the
property had when it was last in sync.

#### Parameters

##### property

`string`

The property name

#### Returns

`boolean`

True if the property is linked and the link is broken

***

### isRecoveryCodesProperty()

> **isRecoveryCodesProperty**(`property`): `boolean`

Check if a property holds recovery codes

#### Parameters

##### property

`string`

The property name

#### Returns

`boolean`

True if the property was made a recovery codes property with
 [Entry.setRecoveryCodes](#setrecoverycodes) and is still a password field

***

### linkProperty()

> **linkProperty**(`property`, `target`, `targetProperty?`): `this`

Link a property to a property on another entry
The property then shows the current value of the other entry's
property, eg. several logins sharing one account's password. A copy
of the value is stored too, so that apps without link support still
show a real value. Setting the property later replaces the link with
its own value.

#### Parameters

##### property

`string`

The property to link (created if it doesn't exist)

##### target

`Entry`

The entry to link to, in the same vault

##### targetProperty?

`string` = `property`

The property on the target entry to link to.
 Defaults to the same property name.

#### Returns

`this`

Self

#### Throws

Throws if the target is in another vault or in Trash,
 doesn't have the property, or the link would create a loop

***

### markRecoveryCodeUsed()

> **markRecoveryCodeUsed**(`property`, `code`, `used?`): `this`

Mark a recovery code as used, or as unused again

#### Parameters

##### property

`string`

The recovery codes property

##### code

`string`

The code, as returned by [Entry.getRecoveryCodes](#getrecoverycodes)

##### used?

`boolean` = `true`

Whether the code is used (default) or not

#### Returns

`this`

Self

#### Throws

Throws if the property isn't a recovery codes property
 or doesn't contain the code

***

### moveToGroup()

> **moveToGroup**(`group`): `this`

Move the entry to another group

#### Parameters

##### group

[`Group`](Group.md)

The target group

#### Returns

`this`

Returns self

***

### popSingleUsePassword()

> **popSingleUsePassword**(): `string`

Discard the current single-use password and move the next queued one
into the password property
When the last password is used, the password property is left empty
and the entry keeps using single-use passwords, so more can be added.
The used password stays in the entry's history.

#### Returns

`string`

The new current password, or `null` if none are left

#### Throws

Throws if the entry doesn't use single-use passwords

***

### removeTags()

> **removeTags**(...`tags`): `this`

Remove one or more tags

#### Parameters

##### tags

...`string`[]

Collection of tags to remove

#### Returns

`this`

Self

***

### resetPropertyOrders()

> **resetPropertyOrders**(): `this`

Remove the display order of all properties

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

Set an attribute on the entry

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

### setProperty()

> **setProperty**(`property`, `value`): `this`

Set a property on the entry

#### Parameters

##### property

`string`

The property name

##### value

`string`

The property value

#### Returns

`this`

Returns self

***

### setPropertyOrder()

> **setPropertyOrder**(`property`, `order`): `this`

Move a property to a position in the display order
The properties at and after the position move down by one. All
properties are given an order, starting from 0, so properties that
had none keep their current place.

#### Parameters

##### property

`string`

The property to move

##### order

`number`

The 0-based position. `Infinity`, or any position past
 the last property, moves it to the end.

#### Returns

`this`

Self

#### Throws

Throws if the entry has no such property

***

### setPropertyOrders()

> **setPropertyOrders**(`properties`): `this`

Set the display order of the properties, eg. after reordering them by
drag and drop

#### Parameters

##### properties

`string`[]

Property names in their new order. Properties that
 aren't listed follow them, in their current order.

#### Returns

`this`

Self

#### Throws

Throws if a listed property doesn't exist on the entry
 or is listed twice

***

### setPropertyValueType()

> **setPropertyValueType**(`property`, `valueType`): `this`

Set the value type of an entry property

#### Parameters

##### property

`string`

The property to set the value type for

##### valueType

[`EntryPropertyValueType`](../enumerations/EntryPropertyValueType.md)

The new value type to set, or `null` to remove

#### Returns

`this`

Returns self

***

### setRecoveryCodes()

> **setRecoveryCodes**(`property`, `codes?`): `this`

Make a property hold a list of recovery codes (eg. 2FA backup codes)
The codes are stored one per line in the property's value, and the
property becomes a password field, so apps without recovery codes
support still hide it. Which codes are used is stored in a
`BC_ENTRY_RECOVERY_CODES:<property>` attribute.

#### Parameters

##### property

`string`

The property name

##### codes?

`string`[]

The codes. If omitted, the property's current value is
 used, one code per line. Surrounding whitespace and empty lines are
 dropped.

#### Returns

`this`

Self

#### Throws

Throws if there are no codes, or a code contains a line
 break

***

### setSingleUsePasswords()

> **setSingleUsePasswords**(`passwords`): `this`

Use a list of single-use passwords for the entry, used in order
The first password goes in the password property, and the rest are
queued one per line in the [Entry.SingleUsePasswordsProperty](#singleusepasswordsproperty)
property (a password field, so apps hide it). Use
[Entry.popSingleUsePassword](#popsingleusepassword) once the current password was used.

#### Parameters

##### passwords

`string`[]

The passwords, in the order they are to be used.
 Empty passwords are dropped.

#### Returns

`this`

Self

#### Throws

Throws if there are no passwords or a password contains
 a line break

***

### unlinkProperty()

> **unlinkProperty**(`property`, `options?`): `this`

Remove the link from a linked property

#### Parameters

##### property

`string`

The linked property

##### options?

Unlink options. `keepValue` (default `true`) keeps the
 current linked value as the property's own value, `false` deletes
 the property.

###### keepValue?

`boolean`

#### Returns

`this`

Self

***

### unsetRecoveryCodes()

> **unsetRecoveryCodes**(`property`): `this`

Turn a recovery codes property back into a plain password field
The codes stay in the property's value, and which were used is
forgotten.

#### Parameters

##### property

`string`

The property name

#### Returns

`this`

Self

***

### unsetSingleUsePasswords()

> **unsetSingleUsePasswords**(): `this`

Stop using single-use passwords
The current password stays, and the queued ones are removed.

#### Returns

`this`

Self
