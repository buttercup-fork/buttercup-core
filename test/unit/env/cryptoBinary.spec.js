import crypto from "node:crypto";
import { expect } from "chai";
import { getSharedAppEnv } from "../../../dist/node/index.js";
import { BINARY_DATA, BINARY_VECTORS, PASSWORD } from "../../resources/cryptoVectors.js";

// Known-answer tests for binary data (attachments and the like), in the "iocane/2" packing:
//   "iocane/2" | len(4) header JSON {iv,salt,rounds,method}
//   | len(4) border | content | border | len(4) footer JSON {auth}
// Lengths are 32-bit big-endian, the border is 01 00 00 00 00 00 00 01. Keys and
// authentication are as in crypto.spec.js, except that CBC signs the raw content bytes.

function referenceDecryptBinary(base64, password) {
    const data = Buffer.from(base64, "base64");
    expect(data.subarray(0, 8).toString("utf8")).to.equal("iocane/2");
    let offset = 8;
    const headerLength = data.readUInt32BE(offset);
    offset += 4;
    const {
        iv: ivHex,
        salt,
        rounds,
        method
    } = JSON.parse(data.subarray(offset, offset + headerLength).toString("utf8"));
    offset += headerLength;
    const border = Buffer.from([1, 0, 0, 0, 0, 0, 0, 1]);
    expect(data.readUInt32BE(offset)).to.equal(8);
    offset += 4;
    expect(data.subarray(offset, offset + 8).equals(border)).to.equal(true);
    offset += 8;
    const end = data.indexOf(border, offset);
    const content = data.subarray(offset, end);
    const footerLength = data.readUInt32BE(end + 8);
    const { auth } = JSON.parse(data.subarray(end + 12, end + 12 + footerLength).toString("utf8"));
    expect(end + 12 + footerLength).to.equal(data.length);
    const iv = Buffer.from(ivHex, "hex");
    if (method === "gcm") {
        const key = crypto.pbkdf2Sync(password, salt, rounds, 32, "sha256");
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAAD(Buffer.from(`${ivHex}${salt}`, "utf8"));
        decipher.setAuthTag(Buffer.from(auth, "hex"));
        return Buffer.concat([decipher.update(content), decipher.final()]);
    }
    const derived = crypto.pbkdf2Sync(password, salt, rounds, 64, "sha256");
    const mac = crypto
        .createHmac("sha256", derived.subarray(32))
        .update(content)
        .update(ivHex)
        .update(salt)
        .digest("hex");
    expect(mac).to.equal(auth);
    const decipher = crypto.createDecipheriv("aes-256-cbc", derived.subarray(0, 32), iv);
    return Buffer.concat([decipher.update(content), decipher.final()]);
}

async function fails(promise) {
    try {
        await promise;
    } catch (err) {
        return true;
    }
    return false;
}

describe("binary encryption (known answers)", function () {
    const decryptBuffer = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");
    const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");

    for (const [name, base64] of Object.entries(BINARY_VECTORS)) {
        describe(name, function () {
            it("is decrypted by the library", async function () {
                const plain = await decryptBuffer(Buffer.from(base64, "base64"), PASSWORD);
                expect(Buffer.isBuffer(plain)).to.equal(true);
                expect([...plain]).to.deep.equal([...BINARY_DATA]);
            });

            it("is decrypted by the reference decryptor", function () {
                expect([...referenceDecryptBinary(base64, PASSWORD)]).to.deep.equal([
                    ...BINARY_DATA
                ]);
            });

            it("is not decrypted with the wrong password", async function () {
                const data = Buffer.from(base64, "base64");
                expect(await fails(decryptBuffer(data, `${PASSWORD}!`))).to.equal(true);
            });

            it("is not decrypted when a byte of the content is changed", async function () {
                const data = Buffer.from(base64, "base64");
                data[200] ^= 1;
                expect(await fails(decryptBuffer(data, PASSWORD))).to.equal(true);
            });

            it("is not decrypted when it is cut short", async function () {
                const data = Buffer.from(base64, "base64");
                expect(
                    await fails(decryptBuffer(data.subarray(0, data.length - 5), PASSWORD))
                ).to.equal(true);
            });
        });
    }

    it("refuses data that isn't in the format", async function () {
        expect(await fails(decryptBuffer(Buffer.from("not encrypted at all"), PASSWORD))).to.equal(
            true
        );
        expect(await fails(decryptBuffer(Buffer.alloc(0), PASSWORD))).to.equal(true);
    });

    it("refuses a header that asks for an absurd number of rounds", async function () {
        const data = Buffer.from(BINARY_VECTORS["AES-GCM, 5,000 rounds"], "base64");
        const hacked = Buffer.from(
            data.toString("latin1").replace('"rounds":5000', '"rounds":9e15'),
            "latin1"
        );
        expect(await fails(decryptBuffer(hacked, PASSWORD))).to.equal(true);
    });

    describe("new encryption", function () {
        it("is readable by the reference decryptor", async function () {
            const encrypted = await encryptBuffer(Buffer.from(BINARY_DATA), PASSWORD);
            expect(Buffer.isBuffer(encrypted)).to.equal(true);
            const plain = referenceDecryptBinary(encrypted.toString("base64"), PASSWORD);
            expect([...plain]).to.deep.equal([...BINARY_DATA]);
        });

        it("round-trips data of every size around the border bytes", async function () {
            for (const size of [0, 1, 7, 8, 9, 15, 16, 17, 1000]) {
                const data = Buffer.alloc(size, 1);
                const encrypted = await encryptBuffer(data, PASSWORD);
                expect([...(await decryptBuffer(encrypted, PASSWORD))]).to.deep.equal([...data]);
            }
        });

        it("round-trips data that contains the border marker", async function () {
            const marker = [1, 0, 0, 0, 0, 0, 0, 1];
            const data = Buffer.from([...marker, 9, 9, ...marker, ...marker, 7]);
            const encrypted = await encryptBuffer(data, PASSWORD);
            expect([...(await decryptBuffer(encrypted, PASSWORD))]).to.deep.equal([...data]);
        });
    });
});
