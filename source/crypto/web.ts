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

// Vault encryption in browsers and other WebCrypto environments, see ./format.ts for the format.
// Encryption is always AES-256-GCM; AES-CBC (with an HMAC) can only be read.

// TypeScript only accepts array buffers (not SharedArrayBuffers) as WebCrypto input
type Bytes = Uint8Array<ArrayBuffer>;

function getSubtle(): SubtleCrypto {
    const webCrypto = globalThis.crypto;
    if (!webCrypto || !webCrypto.subtle) {
        throw new Error("Web Crypto (crypto.subtle) is not available");
    }
    return webCrypto.subtle;
}

function randomBytes(length: number): Bytes {
    return globalThis.crypto.getRandomValues(new Uint8Array(length)) as Bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    // in chunks, so a large attachment doesn't exceed the argument limit
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function checkPassword(password: string) {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("Failed deriving key: Password must be provided");
    }
}

function generateSalt(): string {
    // 9 random bytes are exactly 12 base64 characters
    return bytesToBase64(randomBytes((SALT_LENGTH / 4) * 3));
}

async function deriveKey(
    password: string,
    salt: string,
    rounds: number,
    bytes: number
): Promise<Bytes> {
    const subtle = getSubtle();
    const base = await subtle.importKey("raw", textToBytes(password), "PBKDF2", false, [
        "deriveBits"
    ]);
    const bits = await subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: textToBytes(salt), iterations: rounds },
        base,
        bytes * 8
    );
    return new Uint8Array(bits);
}

async function encryptBytes(
    data: Uint8Array,
    password: string,
    rounds: number
): Promise<Parts<Uint8Array>> {
    checkPassword(password);
    const subtle = getSubtle();
    const salt = generateSalt();
    const iv = randomBytes(IV_BYTES);
    const ivHex = bytesToHex(iv);
    const key = await subtle.importKey(
        "raw",
        await deriveKey(password, salt, rounds, 32),
        "AES-GCM",
        false,
        ["encrypt"]
    );
    // WebCrypto returns the ciphertext with the authentication tag at the end
    const sealed = new Uint8Array(
        await subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData: additionalData({ iv: ivHex, salt }),
                tagLength: TAG_BYTES * 8
            },
            key,
            data as Bytes
        )
    );
    return {
        auth: bytesToHex(sealed.subarray(sealed.length - TAG_BYTES)),
        content: sealed.subarray(0, sealed.length - TAG_BYTES),
        iv: ivHex,
        method: "gcm",
        rounds,
        salt
    };
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
    const subtle = getSubtle();
    const iv = hexToBytes(parts.iv);
    if (parts.method === "gcm") {
        const key = await subtle.importKey(
            "raw",
            await deriveKey(password, parts.salt, parts.rounds, 32),
            "AES-GCM",
            false,
            ["decrypt"]
        );
        return new Uint8Array(
            await subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv,
                    additionalData: additionalData(parts),
                    tagLength: TAG_BYTES * 8
                },
                key,
                concatBytes(parts.content, hexToBytes(parts.auth))
            )
        );
    }
    const derived = await deriveKey(password, parts.salt, parts.rounds, 64);
    const hmacKey = await subtle.importKey(
        "raw",
        derived.subarray(32),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );
    const valid = await subtle.verify(
        "HMAC",
        hmacKey,
        hexToBytes(parts.auth),
        concatBytes(signedContent, additionalData(parts))
    );
    if (!valid) {
        throw new Error("Authentication failed while decrypting content");
    }
    const aesKey = await subtle.importKey("raw", derived.subarray(0, 32), "AES-CBC", false, [
        "decrypt"
    ]);
    return new Uint8Array(
        await subtle.decrypt({ name: "AES-CBC", iv }, aesKey, parts.content as Bytes)
    );
}

export async function encryptText(text: string, password: string, rounds: number): Promise<string> {
    const parts = await encryptBytes(textToBytes(text), password, rounds);
    return packText({ ...parts, content: bytesToBase64(parts.content) });
}

export async function decryptText(encrypted: string, password: string): Promise<string> {
    const parts = unpackText(encrypted);
    const content = base64ToBytes(parts.content);
    const plain = await decryptBytes({ ...parts, content }, password, textToBytes(parts.content));
    return bytesToText(plain);
}

export async function encryptBuffer(
    data: ArrayBuffer | Uint8Array,
    password: string,
    rounds: number
): Promise<ArrayBuffer> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const packed = packData(await encryptBytes(bytes, password, rounds));
    return packed.buffer.slice(
        packed.byteOffset,
        packed.byteOffset + packed.byteLength
    ) as ArrayBuffer;
}

export async function decryptBuffer(
    encrypted: ArrayBuffer | Uint8Array,
    password: string
): Promise<ArrayBuffer> {
    const bytes = encrypted instanceof Uint8Array ? encrypted : new Uint8Array(encrypted);
    const parts = unpackData(bytes);
    const plain = await decryptBytes(parts, password, parts.content);
    return plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength) as ArrayBuffer;
}
