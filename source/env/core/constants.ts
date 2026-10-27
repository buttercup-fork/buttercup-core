// OWASP's Password Storage Cheat Sheet recommends 600,000 for PBKDF2-HMAC-SHA256
// (C-050; was 250,000, iocane's default). Rounds are stored per vault in the
// encrypted blob's own header and read back on decrypt, so raising this is
// backwards compatible: existing vaults keep decrypting with whatever rounds
// they were saved with, and pick up the new count on their next save.
export const CRYPTO_PBKDF2_ROUNDS = 600000;
export const CRYPTO_RANDOM_STRING_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~-_=+[]{}|;:,.<>?!@#$%^&*()";
