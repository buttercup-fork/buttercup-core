[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultSourceEntrySearch

# Class: VaultSourceEntrySearch

## Extends

- [`VaultEntrySearch`](VaultEntrySearch.md)

## Constructors

### Constructor

> **new VaultSourceEntrySearch**(`sources`, `memory?`, `searcherFactory?`): `VaultSourceEntrySearch`

#### Parameters

##### sources

[`VaultSource`](VaultSource.md)[]

##### memory?

[`StorageInterface`](StorageInterface.md)

##### searcherFactory?

`SearcherFactory`

#### Returns

`VaultSourceEntrySearch`

#### Overrides

[`VaultEntrySearch`](VaultEntrySearch.md).[`constructor`](VaultEntrySearch.md#constructor)

## Accessors

### results

#### Get Signature

> **get** **results**(): [`SearchResult`](../interfaces/SearchResult.md)[]

Last search results

##### Deprecated

Use `getResults` instead

##### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

#### Overrides

[`VaultEntrySearch`](VaultEntrySearch.md).[`results`](VaultEntrySearch.md#results)

## Methods

### getResults()

> **getResults**(): [`SearchResult`](../interfaces/SearchResult.md)[]

Get last search results

#### Returns

[`SearchResult`](../interfaces/SearchResult.md)[]

An array of results

#### Overrides

[`VaultEntrySearch`](VaultEntrySearch.md).[`getResults`](VaultEntrySearch.md#getresults)

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

[`VaultEntrySearch`](VaultEntrySearch.md).[`incrementScore`](VaultEntrySearch.md#incrementscore)

***

### prepare()

> **prepare**(): `Promise`\<`void`\>

Prepare the search instance by processing
entries

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`VaultEntrySearch`](VaultEntrySearch.md).[`prepare`](VaultEntrySearch.md#prepare)

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

#### Overrides

[`VaultEntrySearch`](VaultEntrySearch.md).[`searchByTerm`](VaultEntrySearch.md#searchbyterm)

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

#### Overrides

[`VaultEntrySearch`](VaultEntrySearch.md).[`searchByURL`](VaultEntrySearch.md#searchbyurl)
