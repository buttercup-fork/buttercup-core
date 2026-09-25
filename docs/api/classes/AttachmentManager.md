[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / AttachmentManager

# Class: AttachmentManager

## Constructors

### Constructor

> **new AttachmentManager**(`vaultSource`): `AttachmentManager`

Constructor for new attachment managers

#### Parameters

##### vaultSource

[`VaultSource`](VaultSource.md)

The vault source to attach to. This is
 normally set by the VaultSource automatically when unlocking a source.

#### Returns

`AttachmentManager`

## Methods

### getAttachment()

> **getAttachment**(`entry`, `attachmentID`): `Promise`\<`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>\>

Get an attachment's data

#### Parameters

##### entry

[`Entry`](Entry.md)

Entry instance the attachment can be found on

##### attachmentID

`string`

The attachment ID

#### Returns

`Promise`\<`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>\>

#### Throws

Throws if the attachment isn't found

***

### getAttachmentDetails()

> **getAttachmentDetails**(`entry`, `attachmentID`): `Promise`\<[`AttachmentDetails`](../interfaces/AttachmentDetails.md) \| `null`\>

Get an attachment's details

#### Parameters

##### entry

[`Entry`](Entry.md)

Entry instance the attachment can be found on

##### attachmentID

`string`

The attachment ID

#### Returns

`Promise`\<[`AttachmentDetails`](../interfaces/AttachmentDetails.md) \| `null`\>

The details or null if the attachment isn't found

***

### listAttachments()

> **listAttachments**(`entry`): `Promise`\<[`AttachmentDetails`](../interfaces/AttachmentDetails.md)[]\>

List all attachments

#### Parameters

##### entry

[`Entry`](Entry.md)

Entry instance the attachment can be found on

#### Returns

`Promise`\<[`AttachmentDetails`](../interfaces/AttachmentDetails.md)[]\>

***

### newAttachmentID()

> `static` **newAttachmentID**(): `string`

Get a new attachment ID

#### Returns

`string`

***

### removeAttachment()

> **removeAttachment**(`entry`, `attachmentID`): `Promise`\<`void`\>

Remove an attachment, deleting the file and removing it from
 the entry

#### Parameters

##### entry

[`Entry`](Entry.md)

Entry instance the attachment can be found on

##### attachmentID

`string`

The attachment ID

#### Returns

`Promise`\<`void`\>

***

### setAttachment()

> **setAttachment**(`entry`, `attachmentID`, `attachmentData`, `name`, `type`, `timestamp?`): `Promise`\<`void`\>

Write an attachment to an entry.
Creates a new attachment or updates an existing one, by attachment ID

#### Parameters

##### entry

[`Entry`](Entry.md)

Entry instance the attachment can be found on

##### attachmentID

`string`

The attachment ID

##### attachmentData

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

The attachment's data

##### name

`string`

The file name

##### type

`string`

The MIME type

##### timestamp?

`Date` = `...`

Optional timestamp override for the creation of the
 attachment

#### Returns

`Promise`\<`void`\>
