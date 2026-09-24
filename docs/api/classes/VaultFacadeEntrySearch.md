[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultFacadeEntrySearch

# Class: VaultFacadeEntrySearch

## Extends

- `BaseSearch`

## Constructors

### Constructor

> **new VaultFacadeEntrySearch**(`facades`, `memory?`, `searcherFactory?`): `VaultFacadeEntrySearch`

#### Parameters

##### facades

[`VaultFacade`](../interfaces/VaultFacade.md)[]

##### memory?

[`StorageInterface`](StorageInterface.md)

##### searcherFactory?

`SearcherFactory`

#### Returns

`VaultFacadeEntrySearch`

#### Overrides

`BaseSearch.constructor`

## Accessors

### results

#### Get Signature

> **get** **results**(): [`SearchResult`](../interfaces/SearchResult.md)[]

Last search results

##### Deprecated

Use `getResults` instead

##### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

#### Inherited from

`BaseSearch.results`

## Methods

### getResults()

> **getResults**(): [`SearchResult`](../interfaces/SearchResult.md)[]

Get last search results

#### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

An array of results

#### Inherited from

`BaseSearch.getResults`

***

### incrementScore()

> **incrementScore**(`vaultID`, `entryID`, `url`): `Promise`\<`void`\>

Increment the score of a URL in an entry

#### Parameters

##### vaultID

`string`

The vault ID

##### entryID

`string`

The entry ID

##### url

`string`

The URL to increment for

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseSearch.incrementScore`

***

### prepare()

> **prepare**(): `Promise`\<`void`\>

Prepare the search instance by processing
entries

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseSearch.prepare`

***

### searchByTerm()

> **searchByTerm**(`term`): [`SearchResult`](../interfaces/SearchResult.md)[]

Search for entries by term

#### Parameters

##### term

`string`

The term to search for

#### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

An array of search results

#### Inherited from

`BaseSearch.searchByTerm`

***

### searchByURL()

> **searchByURL**(`url`): [`SearchResult`](../interfaces/SearchResult.md)[]

Search for entries by URL

#### Parameters

##### url

`string`

The URL to search with

#### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

An array of search results

#### Inherited from

`BaseSearch.searchByURL`
