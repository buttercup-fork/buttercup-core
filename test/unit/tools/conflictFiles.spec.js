import { expect } from "chai";
import { findConflictCopies, isConflictCopy } from "../../../dist/node/index.js";

describe("tools/conflictFiles", function () {
    describe("isConflictCopy", function () {
        [
            ["Dropbox", "vault (Jane's conflicted copy 2026-09-24).bcup"],
            ["Dropbox, repeated", "vault (Jane's conflicted copy 2026-09-24 (1)).bcup"],
            ["Nextcloud", "vault (conflicted copy 2026-09-24 101500).bcup"],
            ["ownCloud", "vault_conflict-20260924-101500.bcup"],
            ["Syncthing", "vault.sync-conflict-20260924-101500-ABCDEFG.bcup"],
            ["Syncthing, no device ID", "vault.sync-conflict-20260924-101500.bcup"],
            ["Seafile", "vault (SFConflict jane@example.com 2026-09-24-10-15-00).bcup"]
        ].forEach(([service, filename]) => {
            it(`recognises ${service} conflict copies`, function () {
                expect(isConflictCopy("vault.bcup", filename)).to.be.true;
            });
        });

        it("compares file names only, not directories", function () {
            expect(
                isConflictCopy(
                    "/home/jane/Dropbox/vault.bcup",
                    "/home/jane/Dropbox/vault (Jane's conflicted copy 2026-09-24).bcup"
                )
            ).to.be.true;
            expect(
                isConflictCopy(
                    "C:\\Users\\Jane\\Sync\\vault.bcup",
                    "C:\\Users\\Jane\\Sync\\vault.sync-conflict-20260924-101500-ABCDEFG.bcup"
                )
            ).to.be.true;
        });

        it("handles vault names containing dots and spaces", function () {
            expect(
                isConflictCopy(
                    "my.work vault.bcup",
                    "my.work vault.sync-conflict-20260924-101500-ABCDEFG.bcup"
                )
            ).to.be.true;
            expect(
                isConflictCopy(
                    "my.work vault.bcup",
                    "my.work vault (conflicted copy 2026-09-24 101500).bcup"
                )
            ).to.be.true;
        });

        it("does not match the vault file itself", function () {
            expect(isConflictCopy("vault.bcup", "vault.bcup")).to.be.false;
        });

        it("does not match conflict copies of other vaults", function () {
            expect(isConflictCopy("vault.bcup", "vault-old (conflicted copy 2026-09-24).bcup")).to
                .be.false;
            expect(isConflictCopy("vault.bcup", "myvault (conflicted copy 2026-09-24).bcup")).to.be
                .false;
            expect(isConflictCopy("vault.bcup", "other.sync-conflict-20260924-101500.bcup")).to.be
                .false;
        });

        it("does not match other file types", function () {
            expect(isConflictCopy("vault.bcup", "vault (conflicted copy 2026-09-24).txt")).to.be
                .false;
            expect(isConflictCopy("vault.bcup", "vault (conflicted copy 2026-09-24)")).to.be.false;
        });

        it("does not match ordinary copies and backups", function () {
            expect(isConflictCopy("vault.bcup", "vault 2.bcup")).to.be.false;
            expect(isConflictCopy("vault.bcup", "vault (1).bcup")).to.be.false;
            expect(isConflictCopy("vault.bcup", "vault-backup.bcup")).to.be.false;
            expect(isConflictCopy("vault.bcup", "vault (copy).bcup")).to.be.false;
        });

        it("supports vault files without an extension", function () {
            expect(isConflictCopy("vault", "vault (conflicted copy 2026-09-24)")).to.be.true;
            expect(isConflictCopy("vault", "vault")).to.be.false;
        });
    });

    describe("findConflictCopies", function () {
        it("returns only the vault's conflict copies, as given", function () {
            const files = [
                "/sync/vault.bcup",
                "/sync/vault (Jane's conflicted copy 2026-09-24).bcup",
                "/sync/vault.sync-conflict-20260924-101500-ABCDEFG.bcup",
                "/sync/other.bcup",
                "/sync/other (conflicted copy 2026-09-24).bcup",
                "/sync/notes.txt"
            ];
            expect(findConflictCopies("/sync/vault.bcup", files)).to.deep.equal([
                "/sync/vault (Jane's conflicted copy 2026-09-24).bcup",
                "/sync/vault.sync-conflict-20260924-101500-ABCDEFG.bcup"
            ]);
        });

        it("returns an empty array when there are none", function () {
            expect(findConflictCopies("vault.bcup", ["vault.bcup", "other.bcup"])).to.deep.equal(
                []
            );
        });
    });
});
