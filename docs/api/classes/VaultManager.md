[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultManager

# Class: VaultManager

Vault manager, to manage vault sources and their vaults

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new VaultManager**(`opts?`): `VaultManager`

Construct a new VaultManager

#### Parameters

##### opts?

[`VaultManagerOptions`](../interfaces/VaultManagerOptions.md) = `{}`

Configuration options

#### Returns

`VaultManager`

#### Overrides

`EventEmitter.constructor`

## Properties

### STORAGE\_KEY\_PREFIX

> `static` **STORAGE\_KEY\_PREFIX**: `string`

Key prefix for stored vaults

## Accessors

### sources

#### Get Signature

> **get** **sources**(): [`VaultSource`](VaultSource.md)[]

Array of vault sources

##### Returns

[`VaultSource`](VaultSource.md)[]

***

### unlockedSources

#### Get Signature

> **get** **unlockedSources**(): [`VaultSource`](VaultSource.md)[]

Array of unlocked vault sources

##### Returns

[`VaultSource`](VaultSource.md)[]

## Methods

### addSource()

> **addSource**(`source`, `opts?`): `Promise`\<`void`\>

Add a VaultSource to the VaultManager
- The vault manager will then provide a management
platform for the source, including storage access and
event aggregation.

#### Parameters

##### source

[`VaultSource`](VaultSource.md)

The source to add

##### opts?

[`VaultManagerAddSourceOptions`](../interfaces/VaultManagerAddSourceOptions.md) = `{}`

Options for adding the
 source

#### Returns

`Promise`\<`void`\>

***

### dehydrate()

> **dehydrate**(): `Promise`\<`void`\>

Dehydrate all sources and write them to storage

#### Returns

`Promise`\<`void`\>

A promise that resolves once all sources have been dehydrated

***

### dehydrateSource()

> **dehydrateSource**(`sourceOrSourceID`): `Promise`\<`void`\>

Dehydrate a single vault source

#### Parameters

##### sourceOrSourceID

`string` \| [`VaultSource`](VaultSource.md)

The source, or the ID of the source

#### Returns

`Promise`\<`void`\>

A promise that resolves once the source has been dehydrated

***

### enqueueStateChange()

> **enqueueStateChange**(`cb`): `Promise`\<`void` \| `Promise`\<`any`\>\>

Enqueue an asychronous change of state

#### Parameters

##### cb

`StateChangeEnqueuedFunction`

Callback to enqueue

#### Returns

`Promise`\<`void` \| `Promise`\<`any`\>\>

***

### ~~getLiveSnapshots()~~

> **getLiveSnapshots**(): [`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)[]

Fetch all currently available Live Snapshots of vaults

#### Returns

[`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)[]

An array of snapshot objects

#### Deprecated

Will be removed in next major - insecure

***

### getNextOrder()

> **getNextOrder**(): `number`

Get the next viable order number for a new source

#### Returns

`number`

The new order

***

### getSourceForID()

> **getSourceForID**(`sourceID`): [`VaultSource`](VaultSource.md) \| `null`

Get a source for an ID

#### Parameters

##### sourceID

`string`

The source ID

#### Returns

[`VaultSource`](VaultSource.md) \| `null`

The source with the matching ID or null if not found

***

### getUpdateableSources()

> **getUpdateableSources**(): [`VaultSource`](VaultSource.md)[]

Get an array of sources that can be updated

#### Returns

[`VaultSource`](VaultSource.md)[]

***

### initialise()

> **initialise**(): `void`

Initialise the vault manager

#### Returns

`void`

***

### interruptAutoUpdate()

> **interruptAutoUpdate**(`cb`): `Promise`\<`any`\>

Wait for and interrupt state changes when auto-update is running

#### Parameters

##### cb

[`InterruptedAutoUpdateFunction`](../interfaces/InterruptedAutoUpdateFunction.md)

The callback to execute during the auto-update interruption

#### Returns

`Promise`\<`any`\>

A promise that resolves when ready

#### Example

```ts
vaultManager.interruptAutoUpdate(() => {
     // Do something with auto-updating paused
 });
```

***

### rehydrate()

> **rehydrate**(): `Promise`\<`void`\>

Rehydrate sources from storage

#### Returns

`Promise`\<`void`\>

A promise that resolves once rehydration has completed

#### Throws

Rejects if rehydrating from storage fails

***

### removeSource()

> **removeSource**(`sourceID`): `Promise`\<`void`\>

Remove a source from the storage

#### Parameters

##### sourceID

`string`

The ID of the source to remove

#### Returns

`Promise`\<`void`\>

A promise that resolves once the source has been removed

***

### reorderSource()

> **reorderSource**(`sourceID`, `position`): `Promise`\<`void`\>

Reorder a source

#### Parameters

##### sourceID

`string`

The ID of the source to reorder

##### position

`number`

The 0-based position to move the source to

#### Returns

`Promise`\<`void`\>

#### Throws

Throws if no source is found

***

### reorderSources()

> **reorderSources**(): `void`

Reorder all sources

#### Returns

`void`

***

### ~~restoreLiveSnapshots()~~

> **restoreLiveSnapshots**(`snapshots`): `Promise`\<`void`\>

Restore all sources from snapshots that were taken previously

#### Parameters

##### snapshots

[`VaultLiveSnapshot`](../interfaces/VaultLiveSnapshot.md)[]

An array of snapshot objects

#### Returns

`Promise`\<`void`\>

#### Deprecated

Will be removed in next major - insecure

***

### toggleAutoUpdating()

> **toggleAutoUpdating**(`enable?`, `delay?`): `void`

Toggle auto updating of sources

#### Parameters

##### enable?

`boolean` = `...`

Enable or disable auto updating. Leave empty
 to invert the setting

##### delay?

`number` = `...`

Milliseconds between updates

#### Returns

`void`
