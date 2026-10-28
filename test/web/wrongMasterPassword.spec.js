import { Credentials, ErrorCode, getErrorCode } from "../../source/index.web.js";

// B-117: in the browser a wrong master password on stored credentials fails in
// WebCrypto ("OperationError"); it must carry the same code as in NodeJS
describe("wrong master password on stored credentials (web)", function () {
    it("tags Credentials.fromSecureString with DecryptionFailed", async function () {
        const secure = await Credentials.fromDatasource(
            { type: "memory", property: "x" },
            "correct"
        ).toSecureString();
        let code = "no error";
        let message = "";
        try {
            await Credentials.fromSecureString(secure, "wrong");
        } catch (err) {
            code = getErrorCode(err);
            message = String(err.message);
        }
        expect(code).to.equal(ErrorCode.DecryptionFailed);
        expect(message.indexOf("Failed decrypting credentials")).to.equal(0);
    });

    it("opens them with the right password (control)", async function () {
        const secure = await Credentials.fromDatasource(
            { type: "memory", property: "x" },
            "correct"
        ).toSecureString();
        const opened = await Credentials.fromSecureString(secure, "correct");
        expect(Credentials.isCredentials(opened)).to.equal(true);
    });
});
