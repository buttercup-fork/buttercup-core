[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / findConflictCopies

# Function: findConflictCopies()

> **findConflictCopies**(`vaultFilename`, `filenames`): `string`[]

Find a vault file's conflict copies in a list of files, eg. the contents
of the vault's directory. Merge each into the unlocked vault with
`VaultSource#mergeFromCredentials`, save, and then remove it.

## Parameters

### vaultFilename

`string`

The vault's file name, eg. "vault.bcup"

### filenames

`string`[]

File names or paths to search

## Returns

`string`[]

The matching items from `filenames`
