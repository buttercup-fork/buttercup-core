import { getSharedAppEnv } from "../env/appEnv.js";
import { getMasterPassword } from "../credentials/memory/password.js";
import { Credentials } from "../credentials/Credentials.js";
import { BufferLike } from "../types.js";
import { ErrorCode, withDecryptionErrorCode } from "./error.js";
import { Layerr } from "layerr";

export const ATTACHMENT_EXT = "bcatt";

// Core (and every app's "rng/v1/uuid") has always made vault and attachment
// IDs as UUIDs. Anything else is refused before it becomes part of a storage
// path: the vault ID comes from vault content, so a shared vault could name
// "../../somewhere" (B-685)
const STORAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check that IDs are safe to use in attachment storage paths
 * @param vaultID The vault ID
 * @param attachmentID The attachment ID, if one is used
 * @throws {Layerr} With `ErrorCode.InvalidStorageID` if an ID is not a UUID
 */
export function assertAttachmentStorageIDs(vaultID: unknown, attachmentID?: unknown): void {
    const invalid =
        typeof vaultID !== "string" || !STORAGE_ID.test(vaultID)
            ? "vault"
            : arguments.length > 1 &&
                (typeof attachmentID !== "string" || !STORAGE_ID.test(attachmentID))
              ? "attachment"
              : null;
    if (invalid) {
        throw new Layerr(
            { info: { code: ErrorCode.InvalidStorageID } },
            `Invalid ${invalid} ID for attachment storage: not a UUID`
        );
    }
}

export function decryptAttachment(buff: BufferLike, credentials: Credentials): Promise<BufferLike> {
    const masterPassword = getMasterPassword(credentials.id);
    const decrypt = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");
    return withDecryptionErrorCode(decrypt(buff, masterPassword), "attachment");
}

export function encryptAttachment(buff: BufferLike, credentials: Credentials): Promise<BufferLike> {
    const masterPassword = getMasterPassword(credentials.id);
    const encrypt = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");
    return encrypt(buff, masterPassword);
}

export function getBufferSize(buff: BufferLike): number {
    if (typeof buff.byteLength !== "undefined") {
        return buff.byteLength;
    }
    return (<Buffer>buff).length;
}
