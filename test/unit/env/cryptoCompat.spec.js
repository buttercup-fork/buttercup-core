import crypto from "node:crypto";
import { expect } from "chai";
import { EncryptionAlgorithm, createAdapter } from "iocane";
import { getSharedAppEnv } from "../../../dist/node/index.js";

// Differential tests against iocane, the library this format came from (kept as a dev dependency
// for this): whatever one side writes, the other must read, in both directions, for many sizes
// and contents. Rounds are kept low so the specs stay quick.

const ROUNDS = 1000;
const PASSWORDS = ["a", "correct horse battery staple", "pässwörd ✓ \u{1f511}", "x".repeat(300)];

function iocane(algorithm) {
    const adapter = createAdapter();
    adapter.setAlgorithm(algorithm);
    adapter.setDerivationRounds(ROUNDS);
    return adapter;
}

function randomText(length) {
    // a mix of ASCII, accents, symbols and astral characters
    const pool = ["a", "Z", "0", " ", "\n", "$", "é", "ü", "✓", "ค", "\u{1f511}"];
    let text = "";
    for (let i = 0; i < length; i += 1) text += pool[crypto.randomInt(pool.length)];
    return text;
}

describe("vault encryption compared with iocane", function () {
    this.timeout(60000);
    const encryptData = getSharedAppEnv().getProperty("crypto/v1/encryptText");
    const decryptData = getSharedAppEnv().getProperty("crypto/v1/decryptText");

    before(function () {
        getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds")(ROUNDS);
    });

    after(function () {
        getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds")(null);
    });

    describe("text", function () {
        for (const length of [0, 1, 15, 16, 17, 31, 32, 33, 1000]) {
            it(`is read by iocane, and reads iocane (${length} characters)`, async function () {
                const password = PASSWORDS[length % PASSWORDS.length];
                const text = randomText(length);
                // ours -> iocane
                const ours = await encryptData(text, password);
                expect(await iocane(EncryptionAlgorithm.GCM).decrypt(ours, password)).to.equal(
                    text
                );
                // iocane -> ours, both algorithms
                for (const algorithm of [EncryptionAlgorithm.GCM, EncryptionAlgorithm.CBC]) {
                    const theirs = await iocane(algorithm).encrypt(text, password);
                    expect(await decryptData(theirs, password)).to.equal(text);
                }
            });
        }
    });

    describe("binary", function () {
        for (const length of [0, 1, 15, 16, 17, 255, 256, 65537]) {
            it(`is read by iocane, and reads iocane (${length} bytes)`, async function () {
                const password = PASSWORDS[length % PASSWORDS.length];
                const data = crypto.randomBytes(length);
                const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");
                const decryptBuffer = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");
                // ours -> iocane
                const ours = await encryptBuffer(data, password);
                const readByIocane = await iocane(EncryptionAlgorithm.GCM).decrypt(ours, password);
                expect(Buffer.compare(Buffer.from(readByIocane), data)).to.equal(0);
                // iocane -> ours, both algorithms
                for (const algorithm of [EncryptionAlgorithm.GCM, EncryptionAlgorithm.CBC]) {
                    const theirs = await iocane(algorithm).encrypt(data, password);
                    const readByUs = await decryptBuffer(theirs, password);
                    expect(Buffer.compare(Buffer.from(readByUs), data)).to.equal(0);
                }
            });
        }
    });

    describe("failures", function () {
        it("fail the same way for a wrong password (both algorithms)", async function () {
            for (const algorithm of [EncryptionAlgorithm.GCM, EncryptionAlgorithm.CBC]) {
                const theirs = await iocane(algorithm).encrypt("secret", "right");
                let error;
                try {
                    await decryptData(theirs, "wrong");
                } catch (err) {
                    error = err;
                }
                expect(error, algorithm).to.be.an("error");
                // the library tells a wrong password from other errors by these messages
                expect(error.message).to.match(
                    /Authentication failed while decrypting content|Unsupported state or unable to authenticate data/
                );
            }
        });
    });
});
