import { createAdapter, EncryptionAlgorithm } from "iocane/web";
import { CRYPTO_PBKDF2_ROUNDS, CRYPTO_RANDOM_STRING_CHARS } from "../core/constants.js";

const UINT16_MAX = 65535;

let __derivationRoundsOverride = CRYPTO_PBKDF2_ROUNDS;

function decryptData(data: string | ArrayBuffer, password: string): Promise<string | ArrayBuffer> {
    return createAdapter().decrypt(data, password) as Promise<string | ArrayBuffer>;
}

function encryptData(data: string | ArrayBuffer, password: string): Promise<string | ArrayBuffer> {
    const adapter = createAdapter();
    if (__derivationRoundsOverride > 0) {
        adapter.setDerivationRounds(__derivationRoundsOverride);
    }
    // GCM is authenticated encryption (vs. CBC + a separate HMAC), and the
    // algorithm used is stored per-blob in the encrypted output's own
    // header, so this only affects new encryptions - existing CBC-encrypted
    // vaults keep decrypting exactly as before.
    adapter.setAlgorithm(EncryptionAlgorithm.GCM);
    return adapter.encrypt(data, password) as Promise<string | ArrayBuffer>;
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
        const randCharsLen = CRYPTO_RANDOM_STRING_CHARS.length;
        const randArr = new Uint16Array(length);
        return randArr.reduce((output, nextVal) => {
            const ind = Math.floor((nextVal / UINT16_MAX) * randCharsLen);
            return `${output}${CRYPTO_RANDOM_STRING_CHARS[ind]}`;
        }, "");
    });
}

function setDerivationRounds(rounds: number = null) {
    __derivationRoundsOverride = !rounds ? CRYPTO_PBKDF2_ROUNDS : rounds;
}
