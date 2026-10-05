import { Layerr } from "layerr";

/**
 * Machine-readable error codes attached to errors thrown by Buttercup,
 * readable via `getErrorCode(err)` so consumers don't need to compare
 * error message strings (buttercup/buttercup-core#66)
 */
export enum ErrorCode {
    /**
     * Decryption failed authentication - almost always an incorrect
     * password, but also thrown for tampered/corrupted content
     */
    DecryptionFailed = "DECRYPTION_FAILED",
    /**
     * Content is not a Buttercup vault (missing/invalid signature)
     */
    InvalidVaultSignature = "INVALID_VAULT_SIGNATURE",
    /**
     * Vaults can't be merged: they are in different formats (A and B)
     */
    VaultFormatMismatch = "VAULT_FORMAT_MISMATCH",
    /**
     * Vaults can't be merged: they are different vaults (their IDs differ),
     * not copies of the same one
     */
    VaultMismatch = "VAULT_MISMATCH",
    /**
     * A property or attribute name can't be stored (currently only `__proto__`)
     */
    InvalidPropertyName = "INVALID_PROPERTY_NAME",
    /**
     * A save, update or other vault source change was dropped because the
     * source was locked with `lock({ force: true })` while it waited or ran
     */
    SourceLocked = "SOURCE_LOCKED"
}

// What a wrong password looks like, per algorithm/environment:
//  - AES-CBC (older vaults): iocane's own HMAC check failure
//  - AES-GCM on NodeJS: node's crypto auth tag failure
//  - AES-GCM in the browser: WebCrypto rejects with an "OperationError"
const AUTH_FAILURE_MESSAGES = [
    "Authentication failed while decrypting content",
    "Unsupported state or unable to authenticate data"
];
const WEBCRYPTO_AUTH_FAILURE_NAME = "OperationError";

function isAuthenticationFailure(err: any): boolean {
    if (!err || typeof err !== "object") return false;
    if (err.name === WEBCRYPTO_AUTH_FAILURE_NAME) return true;
    const message = typeof err.message === "string" ? err.message : "";
    return AUTH_FAILURE_MESSAGES.some((failure) => message.indexOf(failure) >= 0);
}

/**
 * Get the error code attached to an error, if any. Codes attached to
 * wrapped (cause) errors are found too.
 * @param err The error to check
 * @returns The error code, or null if none is attached
 */
export function getErrorCode(err: Error): ErrorCode | null {
    if (!err || typeof err !== "object") return null;
    try {
        const { code = null } = Layerr.info(err);
        return code;
    } catch (_) {
        return null;
    }
}

/**
 * Run a decryption operation, tagging an authentication failure (wrong
 * password) with `ErrorCode.DecryptionFailed`
 * @param decryption The decryption promise
 * @param description Short description of what was being decrypted
 */
export async function withDecryptionErrorCode<T>(
    decryption: Promise<T>,
    description: string
): Promise<T> {
    try {
        return await decryption;
    } catch (err) {
        if (isAuthenticationFailure(err)) {
            throw new Layerr(
                {
                    cause: err as Error,
                    info: {
                        code: ErrorCode.DecryptionFailed
                    }
                },
                `Failed decrypting ${description}`
            );
        }
        throw err;
    }
}
