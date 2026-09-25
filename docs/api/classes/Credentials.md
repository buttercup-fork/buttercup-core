[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / Credentials

# Class: Credentials

Secure credentials storage/transfer class
- Allows for the safe transfer of credentials within the
Buttercup application environment. Will not allow
credentials to be shared or transferred outside of the
environment. Credential properties are stored in memory
and are inaccessible to public functions.

## Constructors

### Constructor

> **new Credentials**(`obj?`, `masterPassword?`): `Credentials`

Create a new Credentials instance

#### Parameters

##### obj?

[`CredentialsData`](../interfaces/CredentialsData.md) = `{}`

Object data representing some credentials

##### masterPassword?

`string` = `null`

Optional master password to store with
 the credentials data, which is used for generating secure strings.

#### Returns

`Credentials`

## Properties

### id

> **id**: `string`

***

### PURPOSE\_DECRYPT\_VAULT

> `static` **PURPOSE\_DECRYPT\_VAULT**: `string` = `"vault-decrypt"`

***

### PURPOSE\_ENCRYPT\_VAULT

> `static` **PURPOSE\_ENCRYPT\_VAULT**: `string` = `"vault-encrypt"`

***

### PURPOSE\_SECURE\_EXPORT

> `static` **PURPOSE\_SECURE\_EXPORT**: `string` = `"secure-export"`

## Methods

### allPurposes()

> `static` **allPurposes**(): `string`[]

Get all available purposes

#### Returns

`string`[]

***

### fromCredentials()

> `static` **fromCredentials**(`credentials`, `masterPassword`): `Credentials`

Create a new Credentials instance using an existing Credentials
instance - This can be used to reset a credentials's purposes.

#### Parameters

##### credentials

`Credentials`

A credentials instance

##### masterPassword

`string`

The master password used to
 encrypt the instance being cloned

#### Returns

`Credentials`

#### Throws

Throws if no master password provided

#### Throws

Throws if master password does not match
 original

***

### fromDatasource()

> `static` **fromDatasource**(`datasourceConfig`, `masterPassword?`): `Credentials`

Create a new Credentials instance from a Datasource configuration

#### Parameters

##### datasourceConfig

[`DatasourceConfiguration`](../interfaces/DatasourceConfiguration.md)

The configuration for the
 datasource - this usually includes the credential data used for
 authenticating against the datasource host platform.

##### masterPassword?

`string` = `null`

Optional master password to
 store alongside the credentials. Used to create secure strings.

#### Returns

`Credentials`

***

### fromPassword()

> `static` **fromPassword**(`password`, `masterPassword?`): `Credentials`

Create a new Credentials instance from a password
- uses the single password value as the master password stored
alongside the original password if no master password is
provided. The master password is used when generating secure
strings.

#### Parameters

##### password

`string`

The password to store

##### masterPassword?

`string` = `null`

Optional master password
 to store alongside the credentials. Used to create secure
 strings.

#### Returns

`Credentials`

***

### fromSecureString()

> `static` **fromSecureString**(`content`, `masterPassword`): `Promise`\<`Credentials`\>

Create a new instance from a secure string

#### Parameters

##### content

`string`

Encrypted content

##### masterPassword

`string`

The password for decryption

#### Returns

`Promise`\<`Credentials`\>

A promise that resolves with the new instance

***

### getCredentialsData()

> **getCredentialsData**(): [`CredentialsData`](../interfaces/CredentialsData.md)

Get raw credentials data (only available in specialised environments)

#### Returns

[`CredentialsData`](../interfaces/CredentialsData.md)

Credentials data object, or null if not available

***

### getData()

> **getData**(): [`CredentialsPayload`](../interfaces/CredentialsPayload.md)

Get raw credentials data (only available in specialised environments)

#### Returns

[`CredentialsPayload`](../interfaces/CredentialsPayload.md)

***

### isCredentials()

> `static` **isCredentials**(`inst`): `boolean`

Check if a value is an instance of Credentials

#### Parameters

##### inst

`any`

The value to check

#### Returns

`boolean`

***

### restrictPurposes()

> **restrictPurposes**(`allowedPurposes`): `this`

Restrict the purposes that this set of credentials
can be used for. Once a purpose is removed it can
no longer be added again to the same instance.

#### Parameters

##### allowedPurposes

`string`[]

An array of
 new allowed purposes. If a purpose mentioned is
 not currently permitted, it will be ignored.

#### Returns

`this`

Returns self

#### Example

```ts
credentials.restrictPurposes(
     Credentials.PURPOSE_SECURE_EXPORT
 );
 // credentials can only be exported to an
 // encrypted string, and not used for things
 // like encrypting datasource changes.
```

***

### setCredentialsData()

> **setCredentialsData**(`data`): `void`

Set the credential data

#### Parameters

##### data

[`CredentialsData`](../interfaces/CredentialsData.md)

The credentials data to overwrite the old with

#### Returns

`void`

***

### toSecureString()

> **toSecureString**(): `Promise`\<`string`\>

Convert the credentials to an encrypted string, for storage

#### Returns

`Promise`\<`string`\>

A promise that resolves with the encrypted credentials

#### Throws

Rejects when masterPassword is not a string

#### Throws

Rejects if credentials don't permit secure export purposes
