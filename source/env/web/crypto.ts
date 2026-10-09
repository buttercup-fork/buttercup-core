import { decryptBuffer, decryptText, encryptBuffer, encryptText } from "../../crypto/web.js";
import { CRYPTO_PBKDF2_ROUNDS, CRYPTO_RANDOM_STRING_CHARS } from "../core/constants.js";

const UINT16_MAX = 65535;
// getRandomValues fills at most 65,536 bytes per call
const RANDOM_CHUNK = 8192;

let __derivationRoundsOverride = CRYPTO_PBKDF2_ROUNDS;

function decryptData(data: string | ArrayBuffer, password: string): Promise<string | ArrayBuffer> {
    return typeof data === "string" ? decryptText(data, password) : decryptBuffer(data, password);
}

function encryptData(data: string | ArrayBuffer, password: string): Promise<string | ArrayBuffer> {
    // Always AES-GCM: authenticated encryption (vs. CBC + a separate HMAC). The algorithm used is
    // stored per-blob in the encrypted output's own header, so this only affects new
    // encryptions - existing CBC-encrypted vaults keep decrypting exactly as before.
    const rounds =
        __derivationRoundsOverride > 0 ? __derivationRoundsOverride : CRYPTO_PBKDF2_ROUNDS;
    return typeof data === "string"
        ? encryptText(data, password, rounds)
        : encryptBuffer(data, password, rounds);
}

export function getCryptoResources() {
    return {
        "crypto/v2/decryptBuffer": decryptData,
        "crypto/v2/encryptBuffer": encryptData,
        "crypto/v1/decryptText": decryptData,
        "crypto/v1/encryptText": encryptData,
        "crypto/v1/randomString": randomString,
        "crypto/v1/setDerivationRounds": setDerivationRounds
    };
}

function randomString(length: number): Promise<string> {
    return Promise.resolve().then(() => {
        const webCrypto = globalThis.crypto;
        if (!webCrypto || typeof webCrypto.getRandomValues !== "function") {
            // Never fall back to a weaker source: the result protects keys
            throw new Error("A secure random source (crypto.getRandomValues) is not available");
        }
        const charsLen = CRYPTO_RANDOM_STRING_CHARS.length;
        // Draws at or above this are dropped, so no character is more likely than another
        // (a plain modulo would favour the first few characters)
        const limit = UINT16_MAX + 1 - ((UINT16_MAX + 1) % charsLen);
        let output = "";
        while (output.length < length) {
            const draws = webCrypto.getRandomValues(
                new Uint16Array(Math.min(Math.max(length - output.length, 16), RANDOM_CHUNK))
            );
            for (const value of draws) {
                if (value < limit && output.length < length) {
                    output += CRYPTO_RANDOM_STRING_CHARS[value % charsLen];
                }
            }
        }
        return output;
    });
}

function setDerivationRounds(rounds: number | null = null) {
    __derivationRoundsOverride = !rounds ? CRYPTO_PBKDF2_ROUNDS : rounds;
}
