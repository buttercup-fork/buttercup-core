import { decryptBuffer, decryptText, encryptBuffer, encryptText } from "../../crypto/node.js";
import cryptoRandomString from "crypto-random-string";
import { CRYPTO_PBKDF2_ROUNDS, CRYPTO_RANDOM_STRING_CHARS } from "../core/constants.js";

let __derivationRoundsOverride = CRYPTO_PBKDF2_ROUNDS;

function decryptData(data: string | Buffer, password: string): Promise<string | Buffer> {
    return typeof data === "string" ? decryptText(data, password) : decryptBuffer(data, password);
}

function encryptData(data: string | Buffer, password: string): Promise<string | Buffer> {
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

async function randomString(length: number): Promise<string> {
    return cryptoRandomString({
        length,
        characters: CRYPTO_RANDOM_STRING_CHARS
    });
}

function setDerivationRounds(rounds: number | null = null) {
    __derivationRoundsOverride = !rounds ? CRYPTO_PBKDF2_ROUNDS : rounds;
}
