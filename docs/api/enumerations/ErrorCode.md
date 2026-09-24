[**Buttercup Core API**](../README.md)

***

[Buttercup Core API](../README.md) / ErrorCode

# Enumeration: ErrorCode

Machine-readable error codes attached to errors thrown by Buttercup,
readable via `getErrorCode(err)` so consumers don't need to compare
error message strings (buttercup/buttercup-core#66)

## Enumeration Members

### DecryptionFailed

> **DecryptionFailed**: `"DECRYPTION_FAILED"`

Decryption failed authentication - almost always an incorrect
password, but also thrown for tampered/corrupted content

***

### InvalidVaultSignature

> **InvalidVaultSignature**: `"INVALID_VAULT_SIGNATURE"`

Content is not a Buttercup vault (missing/invalid signature)
