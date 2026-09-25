[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / registerDatasource

# Function: registerDatasource()

> **registerDatasource**(`datasourceType`, `DSClass`, `flags?`): `void`

Register a new datasource
This is called internally by the built-in datasources, but should be called if a
custom datasource is used.

## Parameters

### datasourceType

`string`

The name (slug) of the datasource

### DSClass

`any`

The class for the new datasource

### flags?

#### open?

`boolean`

## Returns

`void`
