import crypto from "node:crypto";
import { promisify } from "node:util";
import {
    IV_BYTES,
    Parts,
    SALT_LENGTH,
    TAG_BYTES,
    additionalData,
    bytesToHex,
    bytesToText,
    concatBytes,
    hexToBytes,
    packData,
    packText,
    textToBytes,
    unpackData,
    unpackText
} from "./format.js";

// Vault encryption on NodeJS, see ./format.ts for the format. Encryption is always AES-256-GCM;
// AES-CBC (with an HMAC) can only be read.

const pbkdf2 = promisify(crypto.pbkdf2);

function checkPassword(password: string) {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("Failed deriving key: Password must be provided");
    }
}

function generateSalt(): string {
    // 9 random bytes are exactly 12 base64 characters
    return crypto.randomBytes((SALT_LENGTH / 4) * 3).toString("base64");
}

function deriveKey(password: string, salt: string, rounds: number, bytes: number): Promise<Buffer> {
    return pbkdf2(password, salt, rounds, bytes, "sha256");
}

function encryptBytes(
    data: Uint8Array,
    password: string,
    rounds: number
): Promise<Parts<Uint8Array>> {
    checkPassword(password);
    const salt = generateSalt();
    const iv = crypto.randomBytes(IV_BYTES);
    const ivHex = bytesToHex(iv);
    return deriveKey(password, salt, rounds, 32).then((key) => {
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
        cipher.setAAD(additionalData({ iv: ivHex, salt }));
        const content = concatBytes(cipher.update(data), cipher.final());
        return {
            auth: bytesToHex(cipher.getAuthTag()),
            content,
            iv: ivHex,
            method: "gcm" as const,
            rounds,
            salt
        };
    });
}

/**
 * Decrypt. The authenticated bytes of CBC differ for text (the base64 string is what is signed)
 * and for binary data (the raw bytes are), so the caller says which it is reading.
 */
async function decryptBytes(
    parts: Parts<Uint8Array>,
    password: string,
    signedContent: Uint8Array
): Promise<Uint8Array> {
    checkPassword(password);
    const iv = hexToBytes(parts.iv);
    if (parts.method === "gcm") {
        const key = await deriveKey(password, parts.salt, parts.rounds, 32);
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
            authTagLength: TAG_BYTES
        });
        decipher.setAAD(additionalData(parts));
        decipher.setAuthTag(hexToBytes(parts.auth));
        return concatBytes(decipher.update(parts.content), decipher.final());
    }
    const derived = await deriveKey(password, parts.salt, parts.rounds, 64);
    const expected = crypto
        .createHmac("sha256", derived.subarray(32))
        .update(signedContent)
        .update(textToBytes(`${parts.iv}${parts.salt}`))
        .digest();
    const actual = hexToBytes(parts.auth);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        throw new Error("Authentication failed while decrypting content");
    }
    const decipher = crypto.createDecipheriv("aes-256-cbc", derived.subarray(0, 32), iv);
    return concatBytes(decipher.update(parts.content), decipher.final());
}

export async function encryptText(text: string, password: string, rounds: number): Promise<string> {
    const parts = await encryptBytes(textToBytes(text), password, rounds);
    return packText({ ...parts, content: Buffer.from(parts.content).toString("base64") });
}

export async function decryptText(encrypted: string, password: string): Promise<string> {
    const parts = unpackText(encrypted);
    const content = new Uint8Array(Buffer.from(parts.content, "base64"));
    const plain = await decryptBytes({ ...parts, content }, password, textToBytes(parts.content));
    return bytesToText(plain);
}

export async function encryptBuffer(
    data: Uint8Array,
    password: string,
    rounds: number
): Promise<Buffer> {
    return Buffer.from(packData(await encryptBytes(data, password, rounds)));
}

export async function decryptBuffer(encrypted: Uint8Array, password: string): Promise<Buffer> {
    const parts = unpackData(encrypted);
    return Buffer.from(await decryptBytes(parts, password, parts.content));
}
