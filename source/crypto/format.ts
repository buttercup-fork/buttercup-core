// The format vaults are encrypted in (this started as the "iocane" library's format and is kept
// byte for byte, so every vault written so far still opens, see test/unit/env/crypto.spec.js).
//
// Text:   content$iv$salt$auth$rounds$method
//         content is base64, iv and auth are hex. Older strings stop after auth (CBC, 1,000 rounds).
// Binary: "iocane/2" | len(4) header JSON {iv,salt,rounds,method}
//         | len(4) border | content | border | len(4) footer JSON {auth}
//         where lengths are 32-bit big-endian and the border is 01 00 00 00 00 00 00 01.
//
// The key comes from PBKDF2-HMAC-SHA256 over the password with the salt (as UTF-8 text):
//   GCM: 32 bytes = the AES-256-GCM key. Additional data = UTF-8 of iv (hex) + salt. auth = tag (hex).
//   CBC: 64 bytes = AES-256-CBC key then HMAC-SHA256 key. auth = hex(HMAC(content + iv (hex) + salt)).
//        (only used to read vaults written by earlier versions)

export type Method = "cbc" | "gcm";

export interface Parts<Content> {
    auth: string;
    content: Content;
    iv: string;
    method: Method;
    rounds: number;
    salt: string;
}

export const DEFAULT_ROUNDS = 1000;
/**
 * The most rounds a vault may ask for. The count is read from the (unauthenticated) header, so
 * without a limit a hostile file could keep a device busy for hours before the password check
 * fails. Vaults use 250,000 today.
 */
export const MAX_ROUNDS = 10_000_000;
export const IV_BYTES = 16;
export const SALT_LENGTH = 12;
export const TAG_BYTES = 16;

const SIGNATURE = "iocane/2";
const BORDER = Uint8Array.of(1, 0, 0, 0, 0, 0, 0, 1);
const LENGTH_BYTES = 4;
const METHODS: Array<string> = ["cbc", "gcm"];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToHex(bytes: Uint8Array): string {
    let output = "";
    for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
    return output;
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
    if (!/^([0-9a-fA-F]{2})*$/.test(hex)) {
        throw new Error("Decoding error: Invalid hexadecimal value");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

export function concatBytes(...parts: Array<Uint8Array>): Uint8Array<ArrayBuffer> {
    const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        output.set(part, offset);
        offset += part.length;
    }
    return output;
}

export function textToBytes(text: string): Uint8Array<ArrayBuffer> {
    return encoder.encode(text);
}

export function bytesToText(bytes: Uint8Array): string {
    return decoder.decode(bytes);
}

/** Bytes that are authenticated (CBC) or bound to the encryption (GCM) next to the content */
export function additionalData(parts: { iv: string; salt: string }): Uint8Array<ArrayBuffer> {
    return textToBytes(`${parts.iv}${parts.salt}`);
}

function checkParts(parts: {
    iv: string;
    salt: string;
    auth: string;
    rounds: number;
    method: string;
}) {
    if (!METHODS.includes(parts.method)) {
        throw new Error(`Invalid algorithm: ${parts.method}`);
    }
    if (!Number.isInteger(parts.rounds) || parts.rounds < 1 || parts.rounds > MAX_ROUNDS) {
        throw new Error("Decoding error: Invalid number of derivation rounds");
    }
    if (
        typeof parts.iv !== "string" ||
        typeof parts.salt !== "string" ||
        typeof parts.auth !== "string"
    ) {
        throw new Error("Decoding error: Encrypted content corrupt or incomplete");
    }
}

export function packText(parts: Parts<string>): string {
    return [parts.content, parts.iv, parts.salt, parts.auth, parts.rounds, parts.method].join("$");
}

export function unpackText(text: string): Parts<string> {
    const [content, iv, salt, auth, rounds, method] = text.split("$");
    if (content === undefined || iv === undefined || salt === undefined || auth === undefined) {
        throw new Error("Decoding error: Encrypted content corrupt or incomplete");
    }
    const parts = {
        auth,
        content,
        iv,
        method: (method || "cbc") as Method,
        rounds: rounds ? parseInt(rounds, 10) : DEFAULT_ROUNDS,
        salt
    };
    checkParts(parts);
    return parts;
}

function withLength(bytes: Uint8Array): Uint8Array {
    const length = new Uint8Array(LENGTH_BYTES);
    new DataView(length.buffer).setUint32(0, bytes.length, false);
    return concatBytes(length, bytes);
}

export function packData(parts: Parts<Uint8Array>): Uint8Array {
    const header = JSON.stringify({
        iv: parts.iv,
        salt: parts.salt,
        rounds: parts.rounds,
        method: parts.method
    });
    const footer = JSON.stringify({ auth: parts.auth });
    return concatBytes(
        textToBytes(SIGNATURE),
        withLength(textToBytes(header)),
        withLength(BORDER),
        parts.content,
        BORDER,
        withLength(textToBytes(footer))
    );
}

function startsWith(bytes: Uint8Array, prefix: Uint8Array, offset: number): boolean {
    if (offset < 0 || offset + prefix.length > bytes.length) return false;
    for (let i = 0; i < prefix.length; i += 1) {
        if (bytes[offset + i] !== prefix[i]) return false;
    }
    return true;
}

export function unpackData(data: Uint8Array): Parts<Uint8Array> {
    const signature = textToBytes(SIGNATURE);
    if (!startsWith(data, signature, 0)) {
        throw new Error("Failed unpacking data: Signature mismatch");
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const readLength = (offset: number): number => {
        if (offset + LENGTH_BYTES > data.length) {
            throw new Error("Decoding error: Encrypted content corrupt or incomplete");
        }
        return view.getUint32(offset, false);
    };
    let offset = signature.length;
    const headerLength = readLength(offset);
    offset += LENGTH_BYTES;
    if (offset + headerLength > data.length) {
        throw new Error("Decoding error: Encrypted content corrupt or incomplete");
    }
    const headerBytes = data.subarray(offset, offset + headerLength);
    offset += headerLength;
    const borderLength = readLength(offset);
    offset += LENGTH_BYTES;
    if (borderLength !== BORDER.length || !startsWith(data, BORDER, offset)) {
        throw new Error("Decoding error: Encrypted content length is corrupt");
    }
    offset += borderLength;
    // The content has no stored length: it ends at a border that is followed by the footer and
    // nothing else. (Random bytes can look like a border now and then, so keep looking until
    // the footer fits exactly.)
    let end = -1;
    let footerLength = 0;
    for (let at = offset; at <= data.length - BORDER.length - LENGTH_BYTES; at += 1) {
        if (data[at] !== BORDER[0] || !startsWith(data, BORDER, at)) continue;
        const length = view.getUint32(at + BORDER.length, false);
        if (at + BORDER.length + LENGTH_BYTES + length === data.length) {
            end = at;
            footerLength = length;
            break;
        }
    }
    if (end === -1) {
        throw new Error("Decoding error: Encrypted content corrupt or incomplete");
    }
    const footerStart = end + BORDER.length + LENGTH_BYTES;
    let header: any;
    let footer: any;
    try {
        header = JSON.parse(bytesToText(headerBytes));
        footer = JSON.parse(bytesToText(data.subarray(footerStart, footerStart + footerLength)));
    } catch (err) {
        throw new Error("Decoding error: Encrypted content corrupt or incomplete");
    }
    const parts = {
        auth: footer && footer.auth,
        content: data.subarray(offset, end),
        iv: header && header.iv,
        method: header && header.method,
        rounds: header && header.rounds,
        salt: header && header.salt
    };
    checkParts(parts);
    return parts as Parts<Uint8Array>;
}
