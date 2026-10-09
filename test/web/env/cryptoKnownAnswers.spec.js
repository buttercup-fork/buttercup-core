import { getSharedAppEnv } from "../../../source/index.web.js";
import { PASSWORD, TEXT, VECTORS } from "../../resources/cryptoVectors.js";

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
