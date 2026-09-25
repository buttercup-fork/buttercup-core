[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / DatasourceConfigurationOneDrive

# Interface: DatasourceConfigurationOneDrive

## Extends

- [`DatasourceConfiguration`](DatasourceConfiguration.md)

## Indexable

> \[`key`: `string`\]: `any`

## Properties

### content?

> `optional` **content?**: `string`

#### Inherited from

[`DatasourceConfiguration`](DatasourceConfiguration.md).[`content`](DatasourceConfiguration.md#content)

***

### endpoint?

> `optional` **endpoint?**: `string`

Microsoft Graph API base URL - only needed for national clouds.
Defaults to "https://graph.microsoft.com/v1.0".

***

### fileID?

> `optional` **fileID?**: `string`

Drive item ID of the vault file. Takes precedence over `path`.

***

### path?

> `optional` **path?**: `string`

Path of the vault file relative to the drive root, eg.
"Vaults/my.bcup". Saving to a path that doesn't exist creates it.

***

### refreshToken?

> `optional` **refreshToken?**: `string`

***

### token

> **token**: `string`

Microsoft Graph OAuth2 access token (needs the `Files.ReadWrite`
scope, or `Files.ReadWrite.AppFolder` for an app-folder-only vault)

***

### type

> **type**: `"onedrive"`

#### Overrides

[`DatasourceConfiguration`](DatasourceConfiguration.md).[`type`](DatasourceConfiguration.md#type)
