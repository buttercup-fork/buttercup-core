import { EncryptionAlgorithm, createAdapter } from "iocane/web/index.js";
import { getSharedAppEnv } from "../../../source/index.web.js";

// Differential tests against iocane's browser build, the library this format came from (a dev
// dependency for this): whatever one side writes, the other must read, in both directions.
const ROUNDS = 1000;
const PASSWORD = "correct horse battery staple ✓";

function iocane(algorithm) {
    const adapter = createAdapter();
    adapter.setAlgorithm(algorithm);
    adapter.setDerivationRounds(ROUNDS);
    return adapter;
}

function randomBytes(length) {
    const bytes = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += 65536) {
        crypto.getRandomValues(bytes.subarray(offset, offset + 65536));
    }
    return bytes;
}

describe("appEnv crypto compared with iocane (web)", function () {
    const encryptText = getSharedAppEnv().getProperty("crypto/v1/encryptText");
    const decryptText = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    const encryptBuffer = getSharedAppEnv().getProperty("crypto/v2/encryptBuffer");
    const decryptBuffer = getSharedAppEnv().getProperty("crypto/v2/decryptBuffer");

    for (const length of [0, 1, 16, 17, 1000]) {
        it(`text of ${length} characters`, async function () {
            const text = "aé✓\u{1f511}".repeat(Math.ceil(length / 4)).slice(0, length);
            const ours = await encryptText(text, PASSWORD);
            expect(await iocane(EncryptionAlgorithm.GCM).decrypt(ours, PASSWORD)).to.equal(text);
            for (const algorithm of [EncryptionAlgorithm.GCM, EncryptionAlgorithm.CBC]) {
                const theirs = await iocane(algorithm).encrypt(text, PASSWORD);
                expect(await decryptText(theirs, PASSWORD)).to.equal(text);
            }
        });
    }

    for (const length of [0, 1, 16, 17, 65537]) {
        it(`binary data of ${length} bytes`, async function () {
            const data = randomBytes(length);
            const ours = await encryptBuffer(data.buffer.slice(0), PASSWORD);
            const readByIocane = await iocane(EncryptionAlgorithm.GCM).decrypt(ours, PASSWORD);
            expect([...new Uint8Array(readByIocane)]).to.deep.equal([...data]);
            for (const algorithm of [EncryptionAlgorithm.GCM, EncryptionAlgorithm.CBC]) {
                const theirs = await iocane(algorithm).encrypt(data.buffer.slice(0), PASSWORD);
                const readByUs = await decryptBuffer(theirs, PASSWORD);
                expect([...new Uint8Array(readByUs)]).to.deep.equal([...data]);
            }
        });
    }
});
