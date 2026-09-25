[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / MemoryStorageInterface

# Class: MemoryStorageInterface

Storage interface for memory storage

## Extends

- [`StorageInterface`](StorageInterface.md)

## Constructors

### Constructor

> **new MemoryStorageInterface**(): `MemoryStorageInterface`

#### Returns

`MemoryStorageInterface`

#### Inherited from

[`StorageInterface`](StorageInterface.md).[`constructor`](StorageInterface.md#constructor)

## Methods

### getAllKeys()

> **getAllKeys**(): `Promise`\<`string`[]\>

Get all keys from storage

#### Returns

`Promise`\<`string`[]\>

A promise that resolves with an array of keys

#### Overrides

[`StorageInterface`](StorageInterface.md).[`getAllKeys`](StorageInterface.md#getallkeys)

***

### getValue()

> **getValue**(`name`): `Promise`\<`string` \| `null`\>

Get the value of a key

#### Parameters

##### name

`string`

The key name

#### Returns

`Promise`\<`string` \| `null`\>

A promise that resolves with the value

#### Overrides

[`StorageInterface`](StorageInterface.md).[`getValue`](StorageInterface.md#getvalue)

***

### removeKey()

> **removeKey**(`name`): `Promise`\<`void`\>

Remove a key

#### Parameters

##### name

`string`

The key name

#### Returns

`Promise`\<`void`\>

A promise that resolves when the removal has completed

#### Overrides

[`StorageInterface`](StorageInterface.md).[`removeKey`](StorageInterface.md#removekey)

***

### setValue()

> **setValue**(`name`, `value`): `Promise`\<`void`\>

Set the value for a key

#### Parameters

##### name

`string`

The key name

##### value

`string`

The value to set

#### Returns

`Promise`\<`void`\>

A promise that resolves when the value is set

#### Overrides

[`StorageInterface`](StorageInterface.md).[`setValue`](StorageInterface.md#setvalue)
