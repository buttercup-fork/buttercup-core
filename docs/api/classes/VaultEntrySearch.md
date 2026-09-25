[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / VaultEntrySearch

# Class: VaultEntrySearch

## Extends

- `BaseSearch`\<[`Vault`](Vault.md)\>

## Extended by

- [`VaultSourceEntrySearch`](VaultSourceEntrySearch.md)

## Constructors

### Constructor

> **new VaultEntrySearch**(`vaults`, `memory?`, `searcherFactory?`): `VaultEntrySearch`

#### Parameters

##### vaults

[`Vault`](Vault.md)[]

##### memory?

[`StorageInterface`](StorageInterface.md)

##### searcherFactory?

`SearcherFactory`

#### Returns

`VaultEntrySearch`

#### Overrides

`BaseSearch<Vault>.constructor`

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
The term can include filters: `#tag` (entries must have every tag
given) and `type:<entry type>`, eg. `type:login` or `type:ssh_key`
(entries must be one of the types given). A term with only filters
returns every matching entry.

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
