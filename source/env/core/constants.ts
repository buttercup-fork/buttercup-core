// Matches iocane's own built-in default (`DERIVED_KEY_ITERATIONS`), within
// OWASP's 200-300k PBKDF2-HMAC-SHA256 compromise range. Rounds are stored
// per-vault in the encrypted blob's own header and read back on decrypt, so
// raising this is fully backwards compatible: existing vaults keep
// decrypting with whatever rounds they were saved with, and only new saves
// pick up the higher count.
export const CRYPTO_PBKDF2_ROUNDS = 250000;
export const CRYPTO_RANDOM_STRING_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~-_=+[]{}|;:,.<>?!@#$%^&*()";
