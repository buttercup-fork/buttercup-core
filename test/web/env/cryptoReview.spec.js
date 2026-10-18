import { getSharedAppEnv } from "../../../source/index.web.js";

// Browser side of test/unit/env/cryptoReview.spec.js (B-591, B-592, B-594)

const PASSWORD = "review password";

describe("appEnv crypto review findings (web)", function () {
    const encryptText = getSharedAppEnv().getProperty("crypto/v1/encryptText");
    const decryptText = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");
    const setDerivationRounds = getSharedAppEnv().getProperty("crypto/v1/setDerivationRounds");

    afterEach(function () {
        setDerivationRounds(10);
    });

    for (const mib of [4, 8]) {
        it(`opens its own text output at ${mib} MiB`, async function () {
            this.timeout(60000);
            const text = "x".repeat(mib * 1024 * 1024);
            const plain = await decryptText(await encryptText(text, PASSWORD), PASSWORD);
            expect(plain.length).to.equal(text.length);
            expect(plain === text).to.equal(true);
        });
    }

    it("refuses a bad base64 character in a large string", async function () {
        this.timeout(60000);
        const encrypted = await encryptText("x".repeat(5 * 1024 * 1024), PASSWORD);
        let error = null;
        try {
            await decryptText("!" + encrypted.slice(1), PASSWORD);
        } catch (err) {
            error = err;
        }
        expect(error).to.be.an("error");
        expect(error.message).to.match(/corrupt or incomplete/);
    });

    it("keeps a leading U+FEFF in decrypted text", async function () {
        for (const text of ["﻿hello", "﻿", "a﻿b"]) {
            expect(await decryptText(await encryptText(text, PASSWORD), PASSWORD)).to.equal(text);
        }
    });

    for (const rounds of [1.5, 1000.25, 10_000_001, Infinity]) {
        it(`refuses ${rounds} derivation rounds for text and for binary`, async function () {
            setDerivationRounds(rounds);
            for (const encrypt of [
                () => encryptText("a", PASSWORD),
                () => encryptBuffer(new Uint8Array([97]), PASSWORD)
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
