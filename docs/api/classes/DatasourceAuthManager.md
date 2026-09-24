[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / DatasourceAuthManager

# Class: DatasourceAuthManager

Authentication manager

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new DatasourceAuthManager**(): `DatasourceAuthManager`

Constructor for the auth manager

#### Returns

`DatasourceAuthManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### executeAuthHandlers()

> **executeAuthHandlers**(`datasourceType`, `datasourceInst`): `Promise`\<`void`\>

Execute auth handlers for a datasource

#### Parameters

##### datasourceType

`string`

The type of datasource (slug)

##### datasourceInst

[`TextDatasource`](TextDatasource.md)

The datasource instance

#### Returns

`Promise`\<`void`\>

A promise that resolves once execution has completed

#### Throws

Throws if no handlers have been specified

***

### getSharedManager()

> `static` **getSharedManager**(): `DatasourceAuthManager`

Get the shared DatasourceAuthManager instance

#### Returns

`DatasourceAuthManager`

The shared auth manager instance

***

### registerHandler()

> **registerHandler**(`datasourceType`, `handler`): `void`

Register an auth handler

#### Parameters

##### datasourceType

`string`

The datasource type

##### handler

`AuthHandlerFunction`

The handler function

#### Returns

`void`

#### Example

```ts
authManager.registerHandler("googledrive", datasource => {
     return renewTokens().then(({ accessToken, refreshToken }) => {
         datasource.token = accessToken;
         datasource.refreshToken = refreshToken;
     });
 });
```

#### Throws

Throws if the handler argument is not a function
