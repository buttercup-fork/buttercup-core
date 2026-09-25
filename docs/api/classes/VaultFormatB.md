[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultFormatB

# Class: VaultFormatB

## Extends

- `VaultFormat`

## Constructors

### Constructor

> **new VaultFormatB**(`source?`): `VaultFormatB`

#### Parameters

##### source?

[`FormatBVault`](../interfaces/FormatBVault.md) = `...`

#### Returns

`VaultFormatB`

#### Overrides

`VaultFormat.constructor`

## Properties

### dirty

> **dirty**: `boolean` = `false`

#### Inherited from

`VaultFormat.dirty`

***

### source

> **source**: [`FormatBVault`](../interfaces/FormatBVault.md)

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

[`FormatBEntry`](../interfaces/FormatBEntry.md)

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

[`FormatBGroup`](../interfaces/FormatBGroup.md)

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

#### Parameters

##### history

[`History`](../interfaces/History.md)

#### Returns

`Object`

#### Overrides

`VaultFormat.extractSharesFromHistory`

***

### findEntryByID()

> **findEntryByID**(`id`): [`FormatBEntry`](../interfaces/FormatBEntry.md)

#### Parameters

##### id

`string`

#### Returns

[`FormatBEntry`](../interfaces/FormatBEntry.md)

#### Overrides

`VaultFormat.findEntryByID`

***

### findGroupByID()

> **findGroupByID**(`id`): [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Parameters

##### id

`string`

#### Returns

[`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Overrides

`VaultFormat.findGroupByID`

***

### findGroupContainingEntryID()

> **findGroupContainingEntryID**(`id`): [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Parameters

##### id

`string`

#### Returns

[`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Overrides

`VaultFormat.findGroupContainingEntryID`

***

### findGroupContainingGroupID()

> **findGroupContainingGroupID**(`id`): [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Parameters

##### id

`string`

#### Returns

[`FormatBGroup`](../interfaces/FormatBGroup.md)

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

> **getAllEntries**(`parentID?`): [`FormatBEntry`](../interfaces/FormatBEntry.md)[]

#### Parameters

##### parentID?

`string` = `null`

#### Returns

[`FormatBEntry`](../interfaces/FormatBEntry.md)[]

#### Overrides

`VaultFormat.getAllEntries`

***

### getAllGroups()

> **getAllGroups**(`parentID?`): [`FormatBGroup`](../interfaces/FormatBGroup.md)[]

#### Parameters

##### parentID?

`string` = `null`

#### Returns

[`FormatBGroup`](../interfaces/FormatBGroup.md)[]

#### Overrides

`VaultFormat.getAllGroups`

***

### getEntryAttributes()

> **getEntryAttributes**(`entrySource`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Parameters

##### entrySource

[`FormatBEntry`](../interfaces/FormatBEntry.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getEntryAttributes`

***

### getEntryChanges()

> **getEntryChanges**(`entrySource`): [`EntryChange`](../interfaces/EntryChange.md)[]

#### Parameters

##### entrySource

[`FormatBEntry`](../interfaces/FormatBEntry.md)

#### Returns

[`EntryChange`](../interfaces/EntryChange.md)[]

#### Overrides

`VaultFormat.getEntryChanges`

***

### getEntryProperties()

> **getEntryProperties**(`entrySource`): [`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Parameters

##### entrySource

[`FormatBEntry`](../interfaces/FormatBEntry.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getEntryProperties`

***

### getFormat()

> **getFormat**(): *typeof* `VaultFormatB`

#### Returns

*typeof* `VaultFormatB`

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

[`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Returns

[`PropertyKeyValueObject`](../interfaces/PropertyKeyValueObject.md)

#### Overrides

`VaultFormat.getGroupAttributes`

***

### getGroupTitle()

> **getGroupTitle**(`groupSource`): `string`

#### Parameters

##### groupSource

[`FormatBGroup`](../interfaces/FormatBGroup.md)

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

[`FormatBEntry`](../interfaces/FormatBEntry.md) \| [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Returns

`string`

#### Overrides

`VaultFormat.getItemID`

***

### getItemParentID()

> **getItemParentID**(`itemSource`): `string`

#### Parameters

##### itemSource

[`FormatBEntry`](../interfaces/FormatBEntry.md) \| [`FormatBGroup`](../interfaces/FormatBGroup.md)

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

> **prepareOrphansGroup**(): [`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Returns

[`FormatBGroup`](../interfaces/FormatBGroup.md)

#### Overrides

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
