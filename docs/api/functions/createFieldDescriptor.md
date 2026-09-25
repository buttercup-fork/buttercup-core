[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / createFieldDescriptor

# Function: createFieldDescriptor()

> **createFieldDescriptor**(`entry`, `title`, `entryPropertyType`, `entryPropertyName`, `options?`): [`EntryFacadeField`](../interfaces/EntryFacadeField.md)

Create a descriptor for a field to be used within a facade

## Parameters

### entry

[`Entry`](../classes/Entry.md)

The entry instance to process or null if the initial value
 should be empty

### title

`string`

The field title

### entryPropertyType

[`EntryPropertyType`](../enumerations/EntryPropertyType.md)

The type of entry property (property/attribute)

### entryPropertyName

`string`

The name of the property

### options?

[`CreateFieldDescriptorOptions`](../interfaces/CreateFieldDescriptorOptions.md) = `{}`

The options for the field

## Returns

[`EntryFacadeField`](../interfaces/EntryFacadeField.md)

The field descriptor
