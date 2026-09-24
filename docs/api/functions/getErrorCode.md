[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / getErrorCode

# Function: getErrorCode()

> **getErrorCode**(`err`): [`ErrorCode`](../enumerations/ErrorCode.md)

Get the error code attached to an error, if any. Codes attached to
wrapped (cause) errors are found too.

## Parameters

### err

`Error`

The error to check

## Returns

[`ErrorCode`](../enumerations/ErrorCode.md)

The error code, or null if none is attached
