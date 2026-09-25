[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultSource

# Class: VaultSource

Vault source class for managing a single vault
within a vault manager

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new VaultSource**(`name`, `type`, `credentialsString`, `config?`): `VaultSource`

#### Parameters

##### name

`string`

##### type

`string`

##### credentialsString

`string`

##### config?

[`VaultSourceConfig`](../interfaces/VaultSourceConfig.md) = `{}`

#### Returns

`VaultSource`

#### Overrides

`EventEmitter.constructor`

## Properties

### STATUS\_LOCKED

> `static` **STATUS\_LOCKED**: [`VaultSourceStatus`](../enumerations/VaultSourceStatus.md) = `VaultSourceStatus.Locked`

***

### STATUS\_PENDING

> `static` **STATUS\_PENDING**: [`VaultSourceStatus`](../enumerations/VaultSourceStatus.md) = `VaultSourceStatus.Pending`

***

### STATUS\_UNLOCKED

> `static` **STATUS\_UNLOCKED**: [`VaultSourceStatus`](../enumerations/VaultSourceStatus.md) = `VaultSourceStatus.Unlocked`

## Accessors

### attachmentManager

#### Get Signature

> **get** **attachmentManager**(): [`AttachmentManager`](AttachmentManager.md)

The attachment manager

##### Returns

[`AttachmentManager`](AttachmentManager.md)

***

### colour

#### Get Signature

> **get** **colour**(): `string`

Source colour

##### Returns

`string`

#### Set Signature

> **set** **colour**(`newColour`): `void`

##### Parameters

###### newColour

`string`

##### Returns

`void`

***

### id

#### Get Signature

> **get** **id**(): `string`

Source ID

##### Returns

`string`

***

### meta

#### Get Signature

> **get** **meta**(): [`VaultSourceMetadata`](../interfaces/VaultSourceMetadata.md)

Meta data

##### Returns

[`VaultSourceMetadata`](../interfaces/VaultSourceMetadata.md)

***

### name

#### Get Signature

> **get** **name**(): `string`

Source name

##### Returns

`string`

***

### order

#### Get Signature

> **get** **order**(): `number`

The vault order on a vault management instance

##### Returns

`number`

***

### status

#### Get Signature

> **get** **status**(): [`VaultSourceStatus`](../enumerations/VaultSourceStatus.md)

Source status

##### Returns

[`VaultSourceStatus`](../enumerations/VaultSourceStatus.md)

***

### type

#### Get Signature

> **get** **type**(): `string`

The datasource type

##### Returns

`string`

***

### vault

#### Get Signature

> **get** **vault**(): [`Vault`](Vault.md)

Vault reference

##### Returns

[`Vault`](Vault.md)

## Methods

### canBeUpdated()

> **canBeUpdated**(): `boolean`

Check if the vault source can be updated

#### Returns

`boolean`

***

### changeMasterPassword()

> **changeMasterPassword**(`oldPassword`, `newPassword`, `meta?`): `Promise`\<`void`\>

Change the master vault password

#### Parameters

##### oldPassword

`string`

The original/current password

##### newPassword

`string`

The new password to change to

##### meta?

Optional metadata

#### Returns

`Promise`\<`void`\>

***

### checkOfflineCopy()

> **checkOfflineCopy**(): `Promise`\<`boolean`\>

Check if the source has an offline copy

#### Returns

`Promise`\<`boolean`\>

A promise which resolves with whether an offline
 copy is available or not

***

### convert()

> **convert**(`targetFormat`): `Promise`\<`void`\>

Convert vault to a new format

#### Parameters

##### targetFormat

[`VaultFormatID`](../enumerations/VaultFormatID.md)

The target format to convert to

#### Returns

`Promise`\<`void`\>

***

### dehydrate()

> **dehydrate**(): `Promise`\<`string`\>

Dehydrate the source to a JSON string, ready for storage

#### Returns

`Promise`\<`string`\>

***

### ~~getLiveSnapshot()~~

> **getLiveSnapshot**(): [`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)

Get a live snapshot of the current unlocked state

#### Returns

[`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)

A snapshot object

#### Deprecated

Will be removed in next major - insecure

***

### getOfflineContent()

> **getOfflineContent**(): `Promise`\<`string` \| `null`\>

Get offline content, if it exists

#### Returns

`Promise`\<`string` \| `null`\>

A promise a resolves with the content, or null
 if it doesn't exist

***

### localDiffersFromRemote()

> **localDiffersFromRemote**(): `Promise`\<`boolean`\>

Detect whether the local archives (in memory) differ from their remote copies
Fetches the remote copies from their datasources and detects differences between
them and their local counterparts. Does not change/update the local items.

#### Returns

`Promise`\<`boolean`\>

A promise that resolves with a boolean - true if
     there are differences, false if there is not

***

### lock()

> **lock**(): `Promise`\<`void`\>

Lock the source

#### Returns

`Promise`\<`void`\>

***

### mergeFromCredentials()

> **mergeFromCredentials**(`credentials`): `Promise`\<[`Vault`](Vault.md)\>

Merge another copy of this vault into it - typically a conflict copy
left by a sync service (see `findConflictCopies`). The copy is loaded
from the given credentials and merged in the same way as remote
changes are on save. The merge is not saved: call `save()` afterwards,
and only then remove the conflict copy.
Throws with `ErrorCode.VaultMismatch` if the copy is a different vault,
`ErrorCode.VaultFormatMismatch` if it's in a different vault format
and `ErrorCode.DecryptionFailed` if its password is wrong.

#### Parameters

##### credentials

[`Credentials`](Credentials.md)

Datasource credentials for the copy, including its
 master password (eg. `Credentials.fromDatasource({ type: "file", path }, password)`)

#### Returns

`Promise`\<[`Vault`](Vault.md)\>

A promise that resolves with the merged vault

***

### mergeFromRemote()

> **mergeFromRemote**(): `Promise`\<[`Vault`](Vault.md)\>

Merge remote contents
Detects differences between a local and a remote item, and merges the
two copies together.

#### Returns

`Promise`\<[`Vault`](Vault.md)\>

A promise that resolves with the newly merged archive -
     This archive is automatically saved over the original local copy.

***

### rehydrate()

> `static` **rehydrate**(`dehydratedString`): `VaultSource`

Rehydrate the vault source from a dehydrated state

#### Parameters

##### dehydratedString

`string`

The dehydrated form of the vault source

#### Returns

`VaultSource`

A rehydrated instance

***

### rename()

> **rename**(`name`): `void`

Rename the vault source

#### Parameters

##### name

`string`

The new name

#### Returns

`void`

***

### ~~restoreFromLiveSnapshot()~~

> **restoreFromLiveSnapshot**(`snapshot`): `Promise`\<`void`\>

Restore unlocked state from a live snapshot

#### Parameters

##### snapshot

[`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)

The snapshot taken previously

#### Returns

`Promise`\<`void`\>

#### Deprecated

Will be removed in next major - insecure

***

### save()

> **save**(`config?`): `Promise`\<`void`\>

Save the vault to the remote, ensuring that it's first merged and
updated to prevent conflicts or overwrites.

#### Parameters

##### config?

[`VaultSourceSaveOptions`](../interfaces/VaultSourceSaveOptions.md) = `{}`

#### Returns

`Promise`\<`void`\>

***

### supportsAttachments()

> **supportsAttachments**(): `boolean`

#### Returns

`boolean`

***

### testMasterPassword()

> **testMasterPassword**(`password`): `Promise`\<`boolean`\>

#### Parameters

##### password

`string`

#### Returns

`Promise`\<`boolean`\>

***

### unlock()

> **unlock**(`vaultCredentials`, `config?`): `Promise`\<`void`\>

#### Parameters

##### vaultCredentials

[`Credentials`](Credentials.md)

##### config?

[`VaultSourceUnlockOptions`](../interfaces/VaultSourceUnlockOptions.md) = `{}`

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`__namedParameters?`): `Promise`\<`void`\>

Update the vault

#### Parameters

##### \_\_namedParameters?

###### skipDiff?

`boolean` = `false`

#### Returns

`Promise`\<`void`\>

A promise that resolves once the update has
 completed

***

### write()

> **write**(): `Promise`\<`void`\>

Write the vault to the remote
- This does not perform any merging or sync checks, but simply
writes the vault contents to the remote, overwriting whatever
was there before.

#### Returns

`Promise`\<`void`\>

A promise that resolves when saving has completed
