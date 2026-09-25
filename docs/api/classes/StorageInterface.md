[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / StorageInterface

# Class: StorageInterface

Storage Interface (stub only)

## See

MemoryStorageInterface

## Extended by

- [`MemoryStorageInterface`](MemoryStorageInterface.md)

## Constructors

### Constructor

> **new StorageInterface**(): `StorageInterface`

#### Returns

`StorageInterface`

## Methods

### getAllKeys()

> **getAllKeys**(): `Promise`\<`string`[]\>

Get all keys as an array

#### Returns

`Promise`\<`string`[]\>

***

### getValue()

> **getValue**(`name`): `Promise`\<`string` \| `null`\>

Get a value for a key

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`string` \| `null`\>

***

### removeKey()

> **removeKey**(`name`): `Promise`\<`void`\>

Remove a value for a key

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

***

### setValue()

> **setValue**(`name`, `value`): `Promise`\<`void`\>

Set a value for a key

#### Parameters

##### name

`string`

##### value

`string` \| `null`

#### Returns

`Promise`\<`void`\>
