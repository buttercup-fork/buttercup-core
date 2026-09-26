import { gzip, ungzip } from "pako";
import { binaryStringToBytes, bytesToBinaryString } from "../../tools/binaryString.js";

/**
 * Compress text using GZIP
 * @param text The text to compress
 * @returns Compressed text, as a binary string
 */
function compress(text: string): string {
    return bytesToBinaryString(
        gzip(text, {
            level: 9
        })
    );
}

/**
 * Decompress a compressed string (GZIP)
 * @param text The compressed text, as a binary string
 * @returns Decompressed text
 */
function decompress(text: string): string {
    return ungzip(binaryStringToBytes(text), { toText: true });
}

export function getCompressionResources() {
    return {
        "compression/v1/compressText": compress,
        "compression/v1/decompressText": decompress
    };
}
