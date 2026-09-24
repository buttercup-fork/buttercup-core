[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / isConflictCopy

# Function: isConflictCopy()

> **isConflictCopy**(`vaultFilename`, `candidateFilename`): `boolean`

Check if a file is a sync service's conflict copy of a vault file.
Paths are accepted; only the file names are compared.

## Parameters

### vaultFilename

`string`

The vault's file name, eg. "vault.bcup"

### candidateFilename

`string`

The file name to check

## Returns

`boolean`

True if the candidate is a conflict copy of the vault
