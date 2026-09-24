[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / TextDatasource

# Class: TextDatasource

Datasource for text input and output

## Extends

- `EventEmitter`

## Extended by

- [`MemoryDatasource`](MemoryDatasource.md)
- [`FileDatasource`](FileDatasource.md)
- [`WebDAVDatasource`](WebDAVDatasource.md)
- [`DropboxDatasource`](DropboxDatasource.md)
- [`GoogleDriveDatasource`](GoogleDriveDatasource.md)
- [`OneDriveDatasource`](OneDriveDatasource.md)

## Constructors

### Constructor

> **new TextDatasource**(`credentials`): `TextDatasource`

Constructor for the text datasource

#### Parameters

##### credentials

[`Credentials`](Credentials.md)

The credentials and configuration for
 the datasource

#### Returns

`TextDatasource`

#### Overrides

`EventEmitter.constructor`

## Properties

### sourceID

> **sourceID**: `string` = `null`

***

### type

> **type**: `string`

## Accessors

### credentials

#### Get Signature

> **get** **credentials**(): [`Credentials`](Credentials.md)

Datasource credentials

##### Returns

[`Credentials`](Credentials.md)

***

### hasContent

#### Get Signature

> **get** **hasContent**(): `boolean`

Whether the datasource currently has content
Used to check if the datasource has encrypted content that can be
loaded. May be used when attempting to open a vault in offline mode.

##### Returns

`boolean`

## Methods

### changePassword()

> **changePassword**(`newCredentials`, `preflight`): `Promise`\<`boolean`\>

Change the password of the vault

#### Parameters

##### newCredentials

[`Credentials`](Credentials.md)

The new credentials to take the new password from

##### preflight

`boolean`

Whether or not the password change attempt is a preflight
 check or not

#### Returns

`Promise`\<`boolean`\>

True/False if in preflight, as to whether or not the password change
 can be performed at this time, or undefined when not in preflight mode.

***

### getAttachment()

> **getAttachment**(`vaultID`, `attachmentID`): `Promise`\<[`BufferLike`](../type-aliases/BufferLike.md)\>

Get attachment buffer
- Downloads the attachment contents into a buffer

#### Parameters

##### vaultID

`string`

The ID of the vault

##### attachmentID

`string`

The ID of the attachment

#### Returns

`Promise`\<[`BufferLike`](../type-aliases/BufferLike.md)\>

***

### getAvailableStorage()

> **getAvailableStorage**(): `Promise`\<`number`\>

Get the available storage space, in bytes

#### Returns

`Promise`\<`number`\>

Bytes of free space, or null if not
 available

***

### getConfiguration()

> **getConfiguration**(): [`DatasourceConfiguration`](../interfaces/DatasourceConfiguration.md)

Get the datasource configuration

#### Returns

[`DatasourceConfiguration`](../interfaces/DatasourceConfiguration.md)

***

### getID()

> **getID**(): `string`

Get the ID of the datasource
ID to uniquely identify the datasource and its parameters

#### Returns

`string`

A hasn of the datasource (unique ID)

***

### getTotalStorage()

> **getTotalStorage**(): `Promise`\<`number`\>

Get the total storage space, in bytes

#### Returns

`Promise`\<`number`\>

Bytes of free space, or null if not
 available

***

### load()

> **load**(`credentials`): `Promise`\<[`DatasourceLoadedData`](../interfaces/DatasourceLoadedData.md)\>

Load from the stored content using a password to decrypt

#### Parameters

##### credentials

[`Credentials`](Credentials.md)

The password or Credentials instance to decrypt with

#### Returns

`Promise`\<[`DatasourceLoadedData`](../interfaces/DatasourceLoadedData.md)\>

A promise that resolves with decrypted history

#### Throws

Rejects if content is empty

***

### putAttachment()

> **putAttachment**(`vaultID`, `attachmentID`, `buffer`, `details`): `Promise`\<`void`\>

Put attachment data

#### Parameters

##### vaultID

`string`

The ID of the vault

##### attachmentID

`string`

The ID of the attachment

##### buffer

[`BufferLike`](../type-aliases/BufferLike.md)

The attachment data

##### details

[`AttachmentDetails`](../interfaces/AttachmentDetails.md)

Attachment details object

#### Returns

`Promise`\<`void`\>

***

### removeAttachment()

> **removeAttachment**(`vaultID`, `attachmentID`): `Promise`\<`void`\>

Remove an attachment

#### Parameters

##### vaultID

`string`

The ID of the vault

##### attachmentID

`string`

The ID of the attachment

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(`history`, `credentials`): `Promise`\<`string`\>

Save archive contents with a password

#### Parameters

##### history

[`History`](../interfaces/History.md)

Archive history to save

##### credentials

[`Credentials`](Credentials.md)

The Credentials instance to encrypt with

#### Returns

`Promise`\<`string`\>

A promise resolving with the encrypted content

***

### setContent()

> **setContent**(`content`): `this`

Set the text content

#### Parameters

##### content

`string`

The encrypted text content

#### Returns

`this`

Self

***

### supportsAttachments()

> **supportsAttachments**(): `boolean`

Whether or not the datasource supports attachments

#### Returns

`boolean`

***

### supportsPasswordChange()

> **supportsPasswordChange**(): `boolean`

Whether or not the datasource supports the changing of the master password

#### Returns

`boolean`

True if the datasource supports password changing

***

### supportsRemoteBypass()

> **supportsRemoteBypass**(): `boolean`

Whether or not the datasource supports bypassing remote fetch operations
 (offline support)

#### Returns

`boolean`

True if content can be set to bypass fetch operations,
 false otherwise

***

### updateInsights()

> **updateInsights**(`insights`): `Promise`\<`void`\>

Record vault insights, if supported, to some destination

#### Parameters

##### insights

[`VaultInsights`](../interfaces/VaultInsights.md)

Vault insights data

#### Returns

`Promise`\<`void`\>
