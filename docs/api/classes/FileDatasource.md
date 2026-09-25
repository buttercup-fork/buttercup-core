[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / FileDatasource

# Class: FileDatasource

File datasource for loading and saving files

## Extends

- [`TextDatasource`](TextDatasource.md)

## Constructors

### Constructor

> **new FileDatasource**(`credentials`): `FileDatasource`

Constructor for the file datasource

#### Parameters

##### credentials

[`Credentials`](Credentials.md)

The credentials instance with which to
 use to configure the datasource

#### Returns

`FileDatasource`

#### Overrides

[`TextDatasource`](TextDatasource.md).[`constructor`](TextDatasource.md#constructor)

## Properties

### mkdir

> **mkdir**: `Function`

***

### readFile

> **readFile**: `Function`

***

### sourceID

> **sourceID**: `string` = `null`

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`sourceID`](TextDatasource.md#sourceid)

***

### stat

> **stat**: `Function`

***

### type

> **type**: `string`

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`type`](TextDatasource.md#type)

***

### unlink

> **unlink**: `Function`

***

### writeFile

> **writeFile**: `Function`

## Accessors

### baseDir

#### Get Signature

> **get** **baseDir**(): `string`

##### Returns

`string`

***

### credentials

#### Get Signature

> **get** **credentials**(): [`Credentials`](Credentials.md)

Datasource credentials

##### Returns

[`Credentials`](Credentials.md)

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`credentials`](TextDatasource.md#credentials)

***

### hasContent

#### Get Signature

> **get** **hasContent**(): `boolean`

Whether the datasource currently has content
Used to check if the datasource has encrypted content that can be
loaded. May be used when attempting to open a vault in offline mode.

##### Returns

`boolean`

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`hasContent`](TextDatasource.md#hascontent)

***

### path

#### Get Signature

> **get** **path**(): `string`

The file path

##### Returns

`string`

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

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`changePassword`](TextDatasource.md#changepassword)

***

### getAttachment()

> **getAttachment**(`vaultID`, `attachmentID`): `Promise`\<[`BufferLike`](../type-aliases/BufferLike.md)\>

Get encrypted attachment
- Loads the attachment contents from a file into a buffer

#### Parameters

##### vaultID

`string`

The ID of the vault

##### attachmentID

`string`

The ID of the attachment

#### Returns

`Promise`\<[`BufferLike`](../type-aliases/BufferLike.md)\>

#### Overrides

[`TextDatasource`](TextDatasource.md).[`getAttachment`](TextDatasource.md#getattachment)

***

### getAvailableStorage()

> **getAvailableStorage**(): `Promise`\<`number`\>

Get the available storage space, in bytes

#### Returns

`Promise`\<`number`\>

Bytes of free space, or null if not
 available

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`getAvailableStorage`](TextDatasource.md#getavailablestorage)

***

### getConfiguration()

> **getConfiguration**(): [`DatasourceConfigurationFile`](../interfaces/DatasourceConfigurationFile.md)

Get the datasource configuration

#### Returns

[`DatasourceConfigurationFile`](../interfaces/DatasourceConfigurationFile.md)

#### Overrides

[`TextDatasource`](TextDatasource.md).[`getConfiguration`](TextDatasource.md#getconfiguration)

***

### getID()

> **getID**(): `string`

Get the ID of the datasource
ID to uniquely identify the datasource and its parameters

#### Returns

`string`

A hasn of the datasource (unique ID)

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`getID`](TextDatasource.md#getid)

***

### getTotalStorage()

> **getTotalStorage**(): `Promise`\<`number`\>

Get the total storage space, in bytes

#### Returns

`Promise`\<`number`\>

Bytes of free space, or null if not
 available

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`getTotalStorage`](TextDatasource.md#gettotalstorage)

***

### load()

> **load**(`credentials`): `Promise`\<[`DatasourceLoadedData`](../interfaces/DatasourceLoadedData.md)\>

Load from the filename specified in the constructor using a password

#### Parameters

##### credentials

[`Credentials`](Credentials.md)

The credentials for decryption

#### Returns

`Promise`\<[`DatasourceLoadedData`](../interfaces/DatasourceLoadedData.md)\>

A promise resolving with archive history

#### Overrides

[`TextDatasource`](TextDatasource.md).[`load`](TextDatasource.md#load)

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

The attachment details

#### Returns

`Promise`\<`void`\>

#### Overrides

[`TextDatasource`](TextDatasource.md).[`putAttachment`](TextDatasource.md#putattachment)

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

#### Overrides

[`TextDatasource`](TextDatasource.md).[`removeAttachment`](TextDatasource.md#removeattachment)

***

### save()

> **save**(`history`, `credentials`): `Promise`\<`string`\>

Save archive history to a file

#### Parameters

##### history

[`History`](../interfaces/History.md)

The archive history to save

##### credentials

[`Credentials`](Credentials.md)

The credentials to save with

#### Returns

`Promise`\<`string`\>

A promise that resolves when saving is complete

#### Overrides

[`TextDatasource`](TextDatasource.md).[`save`](TextDatasource.md#save)

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

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`setContent`](TextDatasource.md#setcontent)

***

### supportsAttachments()

> **supportsAttachments**(): `boolean`

Whether or not the datasource supports attachments

#### Returns

`boolean`

#### Overrides

[`TextDatasource`](TextDatasource.md).[`supportsAttachments`](TextDatasource.md#supportsattachments)

***

### supportsPasswordChange()

> **supportsPasswordChange**(): `boolean`

Whether or not the datasource supports the changing of the master password

#### Returns

`boolean`

True if the datasource supports password changing

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`supportsPasswordChange`](TextDatasource.md#supportspasswordchange)

***

### supportsRemoteBypass()

> **supportsRemoteBypass**(): `boolean`

Whether or not the datasource supports bypassing remote fetch operations

#### Returns

`boolean`

True if content can be set to bypass fetch operations,
 false otherwise

#### Overrides

[`TextDatasource`](TextDatasource.md).[`supportsRemoteBypass`](TextDatasource.md#supportsremotebypass)

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

#### Inherited from

[`TextDatasource`](TextDatasource.md).[`updateInsights`](TextDatasource.md#updateinsights)
