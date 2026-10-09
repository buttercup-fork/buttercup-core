import { expect } from "chai";
import crypto from "node:crypto";
import { getSharedAppEnv } from "../../../dist/node/index.js";
import { PASSWORD, TEXT, VECTORS } from "../../resources/cryptoVectors.js";

// Known-answer tests for the vault encryption format (iocane's text format).
//
// The vectors were made once with iocane 5.2.0 using a fixed salt and IV. Each one must
// decrypt (a) through the library and (b) through the independent reference decryptor in
// this file, which uses nothing but node:crypto. If the encryption library is ever updated,
// forked or replaced, these show that vaults written by every earlier version still open and
// that new output still follows the same format.
//
// Format: content$iv$salt$auth$rounds$method, where content is base64 and iv is hex.
//   key        = PBKDF2-HMAC-SHA256(password, salt as UTF-8, rounds)
//   CBC (64 bytes): bytes 0-31 are the AES-256-CBC key, bytes 32-63 the HMAC-SHA256 key;
//                   auth = hex(HMAC(content + iv + salt))
//   GCM (32 bytes): AES-256-GCM key; additional data = UTF-8 of iv + salt; auth = tag (hex)
//   older strings stop after the auth part: CBC with 1,000 rounds

// Reference decryptor: node:crypto only, written from the format above
function referenceDecrypt(encrypted, password) {
    const [content, ivHex, salt, auth, rounds = "1000", method = "cbc"] = encrypted.split("$");
    const iv = Buffer.from(ivHex, "hex");
    if (method === "cbc") {
        const derived = crypto.pbkdf2Sync(password, salt, parseInt(rounds, 10), 64, "sha256");
        const mac = crypto
            .createHmac("sha256", derived.subarray(32))
            .update(content)
            .update(ivHex)
            .update(salt)
            .digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(auth, "hex"))) {
            throw new Error("Authentication failed while decrypting content");
        }
        const decipher = crypto.createDecipheriv("aes-256-cbc", derived.subarray(0, 32), iv);
        return Buffer.concat([
            decipher.update(Buffer.from(content, "base64")),
            decipher.final()
        ]).toString("utf8");
    }
    if (method === "gcm") {
        const derived = crypto.pbkdf2Sync(password, salt, parseInt(rounds, 10), 32, "sha256");
        const decipher = crypto.createDecipheriv("aes-256-gcm", derived, iv);
        decipher.setAAD(Buffer.from(`${ivHex}${salt}`, "utf8"));
        decipher.setAuthTag(Buffer.from(auth, "hex"));
        return Buffer.concat([
            decipher.update(Buffer.from(content, "base64")),
            decipher.final()
        ]).toString("utf8");
    }
    throw new Error(`Unknown method: ${method}`);
}

async function fails(promise) {
    try {
        await promise;
    } catch (err) {
        return true;
    }
    return false;
}

// Change one character of the content part
function tamper(vector) {
    const [content, ...rest] = vector.split("$");
    const swapped = content[10] === "A" ? "B" : "A";
    return [`${content.slice(0, 10)}${swapped}${content.slice(11)}`, ...rest].join("$");
}

describe("vault encryption (known answers)", function () {
    const decryptText = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    const encryptText = getSharedAppEnv().getProperty("crypto/v1/encryptText");

    for (const [name, vector] of Object.entries(VECTORS)) {
        describe(name, function () {
            it("is decrypted by the library", async function () {
                expect(await decryptText(vector, PASSWORD)).to.equal(TEXT);
            });

            it("is decrypted by the reference decryptor", function () {
                expect(referenceDecrypt(vector, PASSWORD)).to.equal(TEXT);
            });

            it("is not decrypted with the wrong password", async function () {
                expect(await fails(decryptText(vector, `${PASSWORD}!`))).to.equal(true);
            });
        });
    }

    it("rejects changed content (CBC: HMAC check)", async function () {
        const changed = tamper(VECTORS["AES-CBC, 5,000 rounds"]);
        expect(await fails(decryptText(changed, PASSWORD))).to.equal(true);
    });

    it("rejects changed content (GCM: authentication tag)", async function () {
        const changed = tamper(VECTORS["AES-GCM, 5,000 rounds"]);
        expect(await fails(decryptText(changed, PASSWORD))).to.equal(true);
    });

    it("rejects a changed salt (it is part of the authenticated data)", async function () {
        const parts = VECTORS["AES-GCM, 5,000 rounds"].split("$");
        parts[2] = "kat-salt-gcm2";
        expect(await fails(decryptText(parts.join("$"), PASSWORD))).to.equal(true);
    });

    describe("new encryption", function () {
        before(function () {
            // test/index.js leaves the default; make sure no earlier spec changed it
            getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds")(null);
        });

        it("writes AES-GCM with the current number of rounds", async function () {
            const encrypted = await encryptText(TEXT, PASSWORD);
            const [, iv, salt, auth, rounds, method] = encrypted.split("$");
            expect(method).to.equal("gcm");
            expect(rounds).to.equal("250000");
            expect(iv).to.match(/^[0-9a-f]{32}$/);
            expect(salt.length).to.be.greaterThan(8);
            expect(auth).to.match(/^[0-9a-f]{32}$/);
        });

        it("is readable by the reference decryptor", async function () {
            const encrypted = await encryptText(TEXT, PASSWORD);
            expect(referenceDecrypt(encrypted, PASSWORD)).to.equal(TEXT);
        });

        it("never repeats a salt, IV or ciphertext", async function () {
            const first = (await encryptText(TEXT, PASSWORD)).split("$");
            const second = (await encryptText(TEXT, PASSWORD)).split("$");
            expect(first[1]).to.not.equal(second[1]);
            expect(first[2]).to.not.equal(second[2]);
            expect(first[0]).to.not.equal(second[0]);
        });
    });
});
