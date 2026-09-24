import { expect } from "chai";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    Credentials,
    ErrorCode,
    FileDatasource,
    TextDatasource,
    Vault,
    VaultFormatA,
    VaultFormatB,
    getErrorCode
} from "../../dist/node/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getEncryptedVault(Format, password) {
    const vault = new Vault(Format);
    vault.createGroup("General").createEntry("Login").setProperty("username", "user");
    const tds = new TextDatasource(Credentials.fromDatasource({ type: "text" }, password));
    return tds.save(vault.format.getHistory(), Credentials.fromPassword(password));
}

async function loadAndCatch(content, password) {
    const tds = new TextDatasource(Credentials.fromDatasource({ type: "text" }, password));
    tds.setContent(content);
    try {
        await tds.load(Credentials.fromPassword(password));
    } catch (err) {
        return err;
    }
    throw new Error("Expected load to fail");
}

describe("error codes", function () {
    describe("getErrorCode", function () {
        it("returns null for plain errors", function () {
            expect(getErrorCode(new Error("Something"))).to.be.null;
        });

        it("returns null for non-errors", function () {
            expect(getErrorCode(null)).to.be.null;
            expect(getErrorCode("oops")).to.be.null;
        });
    });

    [
        ["Format A", VaultFormatA],
        ["Format B", VaultFormatB]
    ].forEach(([name, Format]) => {
        describe(`using ${name}`, function () {
            it("tags an incorrect password with DecryptionFailed", async function () {
                const encrypted = await getEncryptedVault(Format, "correct");
                const err = await loadAndCatch(encrypted, "wrong");
                expect(getErrorCode(err)).to.equal(ErrorCode.DecryptionFailed);
                // Original message is kept, prefixed
                expect(err.message).to.contain("Failed decrypting vault");
            });

            it("tags non-vault content with InvalidVaultSignature", async function () {
                let err = null;
                try {
                    await Format.parseEncrypted("not a vault", Credentials.fromPassword("test"));
                } catch (e) {
                    err = e;
                }
                expect(err).to.be.an("error");
                expect(getErrorCode(err)).to.equal(ErrorCode.InvalidVaultSignature);
                expect(err.message).to.equal("No valid signature in vault");
            });
        });
    });
    it("tags an incorrect password on an older (AES-CBC) vault with DecryptionFailed", async function () {
        const vaultsDir = resolve(__dirname, "../resources/vaults/format-a");
        const [filename] = readdirSync(vaultsDir);
        const fds = new FileDatasource(
            Credentials.fromDatasource({ path: join(vaultsDir, filename) }, "wrong")
        );
        let err = null;
        try {
            await fds.load(Credentials.fromPassword("wrong"));
        } catch (e) {
            err = e;
        }
        expect(err).to.be.an("error");
        expect(getErrorCode(err)).to.equal(ErrorCode.DecryptionFailed);
    });
});
