[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultFormatA

# Class: VaultFormatA

## Extends

- `VaultFormat`

## Constructors

### Constructor

> **new VaultFormatA**(`source?`): `VaultFormatA`

#### Parameters

##### source?

[`FormatAVault`](../interfaces/FormatAVault.md) = `...`

#### Returns

`VaultFormatA`

#### Overrides

`VaultFormat.constructor`

## Properties

### dirty

> **dirty**: `boolean` = `false`

#### Inherited from

`VaultFormat.dirty`

***

### source

> **source**: [`FormatAVault`](../interfaces/FormatAVault.md)

#### Overrides

`VaultFormat.source`

## Accessors

### history

#### Get Signature

> **get** **history**(): [`History`](../interfaces/History.md)

##### Returns

[`History`](../interfaces/History.md)

#### Inherited from

`VaultFormat.history`

***

### readOnly

#### Get Signature

> **get** **readOnly**(): `boolean`

##### Returns

`boolean`

#### Inherited from

`VaultFormat.readOnly`

## Methods

### cloneEntry()

> **cloneEntry**(`entry`, `targetGroupID`): `void`

#### Parameters

##### entry

[`FormatAEntry`](../interfaces/FormatAEntry.md)

##### targetGroupID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.cloneEntry`

***

### cloneGroup()

> **cloneGroup**(`group`, `targetGroupID`): `void`

#### Parameters

##### group

[`FormatAGroup`](../interfaces/FormatAGroup.md)

##### targetGroupID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.cloneGroup`

***

### createEntry()

> **createEntry**(`groupID`, `entryID`): `void`

#### Parameters

##### groupID

`string`

##### entryID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.createEntry`

***

### createGroup()

> **createGroup**(`parentID`, `groupID`): `void`

#### Parameters

##### parentID

`string`

##### groupID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.createGroup`

***

### deleteEntry()

> **deleteEntry**(`entryID`): `void`

#### Parameters

##### entryID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteEntry`

***

### deleteEntryAttribute()

> **deleteEntryAttribute**(`entryID`, `attribute`): `void`

#### Parameters

##### entryID

`string`

##### attribute

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteEntryAttribute`

***

### deleteEntryProperty()

> **deleteEntryProperty**(`entryID`, `property`): `void`

#### Parameters

##### entryID

`string`

##### property

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteEntryProperty`

***

### deleteGroup()

> **deleteGroup**(`groupID`): `void`

#### Parameters

##### groupID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteGroup`

***

### deleteGroupAttribute()

> **deleteGroupAttribute**(`groupID`, `attribute`): `void`

#### Parameters

##### groupID

`string`

##### attribute

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteGroupAttribute`

***

### deleteVaultAttribute()

> **deleteVaultAttribute**(`attribute`): `void`

#### Parameters

##### attribute

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.deleteVaultAttribute`

***

### encodeRaw()

> `static` **encodeRaw**(`rawContent`, `credentials`): `Promise`\<`string`\>

#### Parameters

##### rawContent

[`History`](../interfaces/History.md)

##### credentials

[`Credentials`](Credentials.md)

#### Returns

`Promise`\<`string`\>

#### Overrides

`VaultFormat.encodeRaw`

***

### erase()

> **erase**(): `void`

#### Returns

`void`

#### Overrides

`VaultFormat.erase`

***

### execute()

> **execute**(`commandOrCommands`): `void`

#### Parameters

##### commandOrCommands

`string` \| `string`[]

#### Returns

`void`

#### Overrides

`VaultFormat.execute`

***

### extractSharesFromHistory()

> `static` **extractSharesFromHistory**(`history`): `Object`

Extract shares from a history collection

#### Parameters

##### history

[`History`](../interfaces/History.md)

A history collection, containing shares

#### Returns

`Object`

The resulting separated histories. The object will
 always contain a `base` property containing the non-share history.
 Each share detected is set on the object under its share ID - being
 set to an array of history lines (non-prefixed) for that share.

#### Overrides

`VaultFormat.extractSharesFromHistory`

***

### findEntryByID()

> **findEntryByID**(`id`): [`FormatAEntry`](../interfaces/FormatAEntry.md) \| `null`

#### Parameters

##### id

`string`

#### Returns

[`FormatAEntry`](../interfaces/FormatAEntry.md) \| `null`

#### Overrides

`VaultFormat.findEntryByID`

***

### findGroupByID()

> **findGroupByID**(`id`): [`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Parameters

##### id

`string`

#### Returns

[`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Overrides

`VaultFormat.findGroupByID`

***

### findGroupContainingEntryID()

> **findGroupContainingEntryID**(`id`): [`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Parameters

##### id

`string`

#### Returns

[`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Overrides

`VaultFormat.findGroupContainingEntryID`

***

### findGroupContainingGroupID()

> **findGroupContainingGroupID**(`id`): [`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Parameters

##### id

`string`

#### Returns

[`FormatAGroup`](../interfaces/FormatAGroup.md) \| `null`

#### Overrides

`VaultFormat.findGroupContainingGroupID`

***

### generateID()

> **generateID**(): `void`

#### Returns

`void`

#### Overrides

`VaultFormat.generateID`

***

### getAllEntries()

> **getAllEntries**(`parentID?`): [`FormatAEntry`](../interfaces/FormatAEntry.md)[]

#### Parameters

##### parentID?

`string` \| `null`

#### Returns

[`FormatAEntry`](../interfaces/FormatAEntry.md)[]

#### Overrides

`VaultFormat.getAllEntries`

***

### getAllGroups()

> **getAllGroups**(`parentID?`): [`FormatAGroup`](../interfaces/FormatAGroup.md)[]

#### Parameters

##### parentID?

`string` \| `null`

#### Returns

[`FormatAGroup`](../interfaces/FormatAGroup.md)[]

#### Overrides

`VaultFormat.getAllGroups`

***

### getEntryAttributes()

> **getEntryAttributes**(`entrySource`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Parameters

##### entrySource

[`FormatAEntry`](../interfaces/FormatAEntry.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getEntryAttributes`

***

### getEntryChanges()

> **getEntryChanges**(`entrySource`): [`EntryChange`](../interfaces/EntryChange.md)[]

#### Parameters

##### entrySource

[`FormatAEntry`](../interfaces/FormatAEntry.md)

#### Returns

[`EntryChange`](../interfaces/EntryChange.md)[]

#### Overrides

`VaultFormat.getEntryChanges`

***

### getEntryProperties()

> **getEntryProperties**(`entrySource`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Parameters

##### entrySource

[`FormatAEntry`](../interfaces/FormatAEntry.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getEntryProperties`

***

### getFormat()

> **getFormat**(): `any`

#### Returns

`any`

#### Overrides

`VaultFormat.getFormat`

***

### getFormatID()

> `static` **getFormatID**(): [`VaultFormatID`](../enumerations/VaultFormatID.md)

#### Returns

[`VaultFormatID`](../enumerations/VaultFormatID.md)

#### Overrides

`VaultFormat.getFormatID`

***

### getGroupAttributes()

> **getGroupAttributes**(`groupSource`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Parameters

##### groupSource

[`FormatAGroup`](../interfaces/FormatAGroup.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getGroupAttributes`

***

### getGroupTitle()

> **getGroupTitle**(`groupSource`): `string`

#### Parameters

##### groupSource

[`FormatAGroup`](../interfaces/FormatAGroup.md)

#### Returns

`string`

#### Overrides

`VaultFormat.getGroupTitle`

***

### getHistory()

> **getHistory**(): [`History`](../interfaces/History.md)

#### Returns

[`History`](../interfaces/History.md)

#### Overrides

`VaultFormat.getHistory`

***

### getItemID()

> **getItemID**(`itemSource`): `string`

#### Parameters

##### itemSource

[`FormatAEntry`](../interfaces/FormatAEntry.md) \| [`FormatAGroup`](../interfaces/FormatAGroup.md)

#### Returns

`string`

#### Overrides

`VaultFormat.getItemID`

***

### getItemParentID()

> **getItemParentID**(`itemSource`): `string`

#### Parameters

##### itemSource

[`FormatAEntry`](../interfaces/FormatAEntry.md) \| [`FormatAGroup`](../interfaces/FormatAGroup.md)

#### Returns

`string`

#### Overrides

`VaultFormat.getItemParentID`

***

### getVaultAttributes()

> **getVaultAttributes**(): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getVaultAttributes`

***

### getVaultID()

> **getVaultID**(): `string`

#### Returns

`string`

#### Overrides

`VaultFormat.getVaultID`

***

### historiesDiffer()

> `static` **historiesDiffer**(`historyA`, `historyB`): `boolean`

#### Parameters

##### historyA

[`History`](../interfaces/History.md)

##### historyB

[`History`](../interfaces/History.md)

#### Returns

`boolean`

#### Overrides

`VaultFormat.historiesDiffer`

***

### initialise()

> **initialise**(): `void`

#### Returns

`void`

#### Overrides

`VaultFormat.initialise`

***

### isEncrypted()

> `static` **isEncrypted**(`contents`): `boolean`

#### Parameters

##### contents

`string`

#### Returns

`boolean`

#### Overrides

`VaultFormat.isEncrypted`

***

### moveEntry()

> **moveEntry**(`entryID`, `groupID`): `void`

#### Parameters

##### entryID

`string`

##### groupID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.moveEntry`

***

### moveGroup()

> **moveGroup**(`groupID`, `newParentID`): `void`

#### Parameters

##### groupID

`string`

##### newParentID

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.moveGroup`

***

### optimise()

> **optimise**(): `void`

#### Returns

`void`

#### Overrides

`VaultFormat.optimise`

***

### parseEncrypted()

> `static` **parseEncrypted**(`encryptedContent`, `credentials`): `Promise`\<[`History`](../interfaces/History.md)\>

#### Parameters

##### encryptedContent

`string`

##### credentials

[`Credentials`](Credentials.md)

#### Returns

`Promise`\<[`History`](../interfaces/History.md)\>

#### Overrides

`VaultFormat.parseEncrypted`

***

### prepareOrphansGroup()

> **prepareOrphansGroup**(): [`FormatAGroup`](../interfaces/FormatAGroup.md) \| [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Returns

[`FormatAGroup`](../interfaces/FormatAGroup.md) \| [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Inherited from

`VaultFormat.prepareOrphansGroup`

***

### setEntryAttribute()

> **setEntryAttribute**(`entryID`, `attribute`, `value`): `void`

#### Parameters

##### entryID

`string`

##### attribute

`string`

##### value

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.setEntryAttribute`

***

### setEntryProperty()

> **setEntryProperty**(`entryID`, `property`, `value`): `void`

#### Parameters

##### entryID

`string`

##### property

`string`

##### value

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.setEntryProperty`

***

### setGroupAttribute()

> **setGroupAttribute**(`groupID`, `attribute`, `value`): `void`

#### Parameters

##### groupID

`string`

##### attribute

`string`

##### value

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.setGroupAttribute`

***

### setGroupTitle()

> **setGroupTitle**(`groupID`, `title`): `void`

#### Parameters

##### groupID

`string`

##### title

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.setGroupTitle`

***

### setVaultAttribute()

> **setVaultAttribute**(`key`, `value`): `void`

#### Parameters

##### key

`string`

##### value

`string`

#### Returns

`void`

#### Overrides

`VaultFormat.setVaultAttribute`

***

### vaultFromMergedHistories()

> `static` **vaultFromMergedHistories**(`base`, `incoming`): [`Vault`](Vault.md)

#### Parameters

##### base

[`History`](../interfaces/History.md)

##### incoming

[`History`](../interfaces/History.md)

#### Returns

[`Vault`](Vault.md)

#### Overrides

`VaultFormat.vaultFromMergedHistories`
