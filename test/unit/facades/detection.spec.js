import { expect } from "chai";
import { isOTPURI, isVaultFacade } from "../../../dist/node/index.js";

describe("facades/detection", function () {
    describe("isVaultFacade", function () {
        it("recognises facade-like objects", function () {
            expect(
                isVaultFacade({
                    type: "vault",
                    id: "1",
                    groups: [],
                    entries: []
                })
            ).to.be.true;
        });

        it("recognises non-facade-like objects", function () {
            expect(
                isVaultFacade({
                    type: "vault",
                    groups: [],
                    entries: []
                })
            ).to.be.false;
            expect(isVaultFacade({})).to.be.false;
            expect(isVaultFacade()).to.be.false;
            expect(isVaultFacade(null)).to.be.false;
        });
    });

    describe("isOTPURI", function () {
        it("returns true for a standard TOTP URI", function () {
            expect(isOTPURI("otpauth://totp/Example:alice@google.com?secret=ABC123&issuer=Example"))
                .to.be.true;
        });

        it("returns true for a HOTP URI", function () {
            expect(isOTPURI("otpauth://hotp/Example:alice@google.com?secret=ABC123&counter=0")).to
                .be.true;
        });

        it("returns true for a label containing a literal space (buttercup/buttercup-core#278)", function () {
            expect(
                isOTPURI(
                    "otpauth://totp/Slack (workspace):user@example.com?secret=ABC123&issuer=Slack"
                )
            ).to.be.true;
        });

        it("returns false for a non-OTP string", function () {
            expect(isOTPURI("not an otp uri")).to.be.false;
        });

        it("returns false for an empty label", function () {
            expect(isOTPURI("otpauth://totp/")).to.be.false;
        });

        it("returns false for a string containing a newline", function () {
            expect(isOTPURI("otpauth://totp/Example:alice@google.com?secret=ABC\n123")).to.be.false;
        });
    });
});
