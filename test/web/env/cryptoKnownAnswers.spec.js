import { getSharedAppEnv } from "../../../source/index.web.js";
import {
    BINARY_DATA,
    BINARY_VECTORS,
    PASSWORD,
    TEXT,
    VECTORS
} from "../../resources/cryptoVectors.js";

// The same vectors as the NodeJS specs (test/unit/env/crypto.spec.js): what was
// written on one platform must open on the other, and in every earlier version.
describe("appEnv crypto (known answers)", function () {
    const decryptText = getSharedAppEnv().getProperty("crypto/v1/decryptText");

    for (const [name, vector] of Object.entries(VECTORS)) {
        describe(name, function () {
            it("is decrypted", async function () {
                expect(await decryptText(vector, PASSWORD)).to.equal(TEXT);
            });

            it("is not decrypted with the wrong password", async function () {
                let failed = false;
                try {
                    await decryptText(vector, `${PASSWORD}!`);
                } catch (err) {
                    failed = true;
                }
                expect(failed).to.equal(true);
            });
        });
    }

    it("reads what the web build writes", async function () {
        const encryptText = getSharedAppEnv().getProperty("crypto/v1/encryptText");
        const encrypted = await encryptText(TEXT, PASSWORD);
        expect(encrypted.split("$")[5]).to.equal("gcm");
        expect(await decryptText(encrypted, PASSWORD)).to.equal(TEXT);
    });
});

describe("appEnv crypto, binary (known answers)", function () {
    const decryptBuffer = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");
    const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");

    function fromBase64(base64) {
        return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer;
    }

    for (const [name, base64] of Object.entries(BINARY_VECTORS)) {
        it(`decrypts ${name}`, async function () {
            const plain = await decryptBuffer(fromBase64(base64), PASSWORD);
            expect(plain).to.be.instanceOf(ArrayBuffer);
            expect([...new Uint8Array(plain)]).to.deep.equal([...BINARY_DATA]);
        });

        it(`rejects ${name} with the wrong password`, async function () {
            let failed = false;
            try {
                await decryptBuffer(fromBase64(base64), `${PASSWORD}!`);
            } catch (err) {
                failed = true;
            }
            expect(failed).to.equal(true);
        });
    }

    it("reads what the web build writes", async function () {
        const encrypted = await encryptBuffer(BINARY_DATA.buffer.slice(0), PASSWORD);
        const plain = await decryptBuffer(encrypted, PASSWORD);
        expect([...new Uint8Array(plain)]).to.deep.equal([...BINARY_DATA]);
    });
});
