// "Binary strings" hold one byte per character (char codes 0-255). Compression
// v1 (Format A) stores gzip output this way; pako 1 produced and read them
// itself (`to: "string"`), but pako 2+ dropped that, so we convert here.

// Stay well under engines' argument count limits for String.fromCharCode
const CHUNK_SIZE = 0x8000;

/**
 * Convert bytes to a binary string (one character per byte)
 * @param bytes The bytes to convert
 * @returns A binary string
 */
export function bytesToBinaryString(bytes: Uint8Array): string {
    let output = "";
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        output += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }
    return output;
}

/**
 * Convert a binary string (one character per byte) to bytes
 * @param str The binary string to convert
 * @returns The bytes
 */
export function binaryStringToBytes(str: string): Uint8Array {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i += 1) {
        bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return bytes;
}
