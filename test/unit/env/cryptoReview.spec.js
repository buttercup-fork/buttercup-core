import crypto from "node:crypto";
import { expect } from "chai";
import { getSharedAppEnv } from "../../../dist/node/index.js";

// Regression tests for the findings of the source/crypto review of f46a5c3 (B-591 to B-594).
// Each one failed on that commit.

const PASSWORD = "review password";
const ROUNDS = 1000;
const BORDER = Buffer.from([1, 0, 0, 0, 0, 0, 0, 1]);

describe("appEnv crypto review findings", function () {
    const encryptText = getSharedAppEnv().getProperty("crypto/v1/encryptText");
    const decryptText = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");
    const decryptBuffer = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");
    const setDerivationRounds = getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds");

    beforeEach(function () {
        setDerivationRounds(ROUNDS);
    });

    afterEach(function () {
        setDerivationRounds(null);
    });

    describe("F1: large text", function () {
        this.timeout(60000);

        for (const mib of [4, 8]) {
            it(`opens its own output at ${mib} MiB`, async function () {
                const text = "x".repeat(mib * 1024 * 1024);
                const encrypted = await encryptText(text, PASSWORD);
                const plain = await decryptText(encrypted, PASSWORD);
                expect(plain.length).to.equal(text.length);
                expect(plain === text).to.equal(true);
            });
        }

        it("still refuses a bad base64 character in a large string", async function () {
            const encrypted = await encryptText("x".repeat(5 * 1024 * 1024), PASSWORD);
            const bad = "!" + encrypted.slice(1);
            let error = null;
            try {
                await decryptText(bad, PASSWORD);
            } catch (err) {
                error = err;
            }
            expect(error).to.be.an("error");
            expect(error.message).to.match(/corrupt or incomplete/);
        });
    });

    describe("F2: leading U+FEFF", function () {
        it("is kept in decrypted text", async function () {
            for (const text of ["﻿hello", "﻿", "﻿﻿x", "a﻿b"]) {
                const encrypted = await encryptText(text, PASSWORD);
                const plain = await decryptText(encrypted, PASSWORD);
                expect(plain).to.equal(text);
            }
        });
    });

    describe("F3: border inside the ciphertext", function () {
        // AES-GCM is a stream cipher, so a plaintext can be chosen whose ciphertext is any bytes:
        // the content below starts with the border followed by a length that reaches the end of
        // the file, the footer of that false candidate is not JSON, and the real footer follows.
        function buildFile() {
            const salt = "AAAAAAAAAAAA";
            const iv = Buffer.alloc(16, 7);
            const ivHex = iv.toString("hex");
            const key = crypto.pbkdf2Sync(PASSWORD, salt, ROUNDS, 32, "sha256");
            const header = Buffer.from(
                JSON.stringify({ iv: ivHex, salt, rounds: ROUNDS, method: "gcm" })
            );
            const lengthOf = (buffer) => {
                const length = Buffer.alloc(4);
                length.writeUInt32BE(buffer.length);
                return length;
            };
            const seal = (plain) => {
                const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
                cipher.setAAD(Buffer.from(ivHex + salt));
                const content = Buffer.concat([cipher.update(plain), cipher.final()]);
                return { content, auth: cipher.getAuthTag().toString("hex") };
            };
            const assemble = (content, auth) => {
                const footer = Buffer.from(JSON.stringify({ auth }));
                return Buffer.concat([
                    Buffer.from("iocane/2"),
                    lengthOf(header),
                    header,
                    lengthOf(BORDER),
                    BORDER,
                    content,
                    BORDER,
                    lengthOf(footer),
                    footer
                ]);
            };
            const size = 64;
            const total = assemble(Buffer.alloc(size), "0".repeat(32)).length;
            const contentStart = 8 + 4 + header.length + 4 + 8;
            const falseLength = Buffer.alloc(4);
            falseLength.writeUInt32BE(total - (contentStart + BORDER.length + 4));
            const wanted = Buffer.concat([BORDER, falseLength, Buffer.alloc(size - 12, 0x41)]);
            const keystream = seal(Buffer.alloc(size)).content;
            const plain = Buffer.from(wanted.map((byte, i) => byte ^ keystream[i]));
            const { content, auth } = seal(plain);
            expect(content.equals(wanted)).to.equal(true);
            return { file: assemble(content, auth), plain };
        }

        it("opens a file whose ciphertext holds a border and a length that reach the end", async function () {
            const { file, plain } = buildFile();
            const opened = await decryptBuffer(file, PASSWORD);
            expect(Buffer.from(opened).equals(plain)).to.equal(true);
        });

        it("still refuses a truncated or extended file", async function () {
            const { file } = buildFile();
            for (const broken of [
                file.subarray(0, file.length - 1),
                Buffer.concat([file, Buffer.from([0])])
            ]) {
                let error = null;
                try {
                    await decryptBuffer(broken, PASSWORD);
                } catch (err) {
                    error = err;
                }
                expect(error).to.be.an("error");
            }
        });

        it("round-trips content that contains the border", async function () {
            const data = Buffer.concat([
                Buffer.from("abc"),
                BORDER,
                Buffer.from([0, 0, 0, 5]),
                BORDER
            ]);
            const opened = await decryptBuffer(await encryptBuffer(data, PASSWORD), PASSWORD);
            expect(Buffer.from(opened).equals(data)).to.equal(true);
        });
    });

    describe("F4: derivation rounds when encrypting", function () {
        for (const rounds of [1.5, 1000.25, 10_000_001, Infinity]) {
            it(`refuses ${rounds} for text and for binary`, async function () {
                setDerivationRounds(rounds);
                for (const encrypt of [
                    () => encryptText("a", PASSWORD),
                    () => encryptBuffer(Buffer.from("a"), PASSWORD)
                ]) {
                    let error = null;
                    try {
                        await encrypt();
                    } catch (err) {
                        error = err;
                    }
                    expect(error, `rounds ${rounds}`).to.be.an("error");
                    expect(error.message).to.match(/derivation rounds/);
                }
            });
        }
    });
});
