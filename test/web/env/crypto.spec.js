import { getSharedAppEnv } from "../../../source/index.web.js";
import { CRYPTO_RANDOM_STRING_CHARS } from "../../../source/env/core/constants.js";

describe("appEnv crypto", function () {
    describe("randomString", function () {
        const randomString = getSharedAppEnv().getProperty("crypto/v1/randomString");

        it("returns a string of the requested length", async function () {
            for (const length of [0, 1, 16, 48, 500, 20000]) {
                const result = await randomString(length);
                expect(result).to.have.lengthOf(length);
            }
        });

        it("only uses the allowed characters", async function () {
            const result = await randomString(2000);
            for (const char of result) {
                expect(CRYPTO_RANDOM_STRING_CHARS).to.include(char);
            }
        });

        it("is not a repeated character", async function () {
            // Regression: the array of random values was never filled, so every
            // string was the first character repeated ("AAAA...")
            const result = await randomString(48);
            expect(new Set(result).size).to.be.greaterThan(10);
        });

        it("returns a different string each time", async function () {
            const results = await Promise.all(Array.from({ length: 20 }, () => randomString(48)));
            expect(new Set(results).size).to.equal(20);
        });

        it("uses (nearly) every character, about equally often", async function () {
            const counts = {};
            for (const char of await randomString(40000)) counts[char] = (counts[char] || 0) + 1;
            const expected = 40000 / CRYPTO_RANDOM_STRING_CHARS.length;
            expect(Object.keys(counts)).to.have.lengthOf(CRYPTO_RANDOM_STRING_CHARS.length);
            // a generous margin (about 6 standard deviations) so the spec doesn't flake
            for (const count of Object.values(counts)) {
                expect(count).to.be.within(expected * 0.55, expected * 1.45);
            }
        });
    });
});
