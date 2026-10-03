import fs from "fs";
import { join } from "path";
import sinon from "sinon";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import { dir } from "tmp";
import { Credentials, FileDatasource, Vault } from "../../../dist/node/index.js";

describe("FileDatasource", function () {
    beforeEach(function (done) {
        this.vault = Vault.createWithDefaults();
        this.vault
            .findGroupsByTitle("General")[0]
            .createEntry("Test")
            .setProperty("username", "test");
        dir((err, dirPath, cleanup) => {
            if (err) return done(err);
            this.fds = new FileDatasource(
                Credentials.fromDatasource({
                    path: join(dirPath, "vault.bcup")
                })
            );
            this.cleanup = cleanup;
            done();
        });
    });

    afterEach(function () {
        this.cleanup();
    });

    it("supports saving and loading", function () {
        return this.fds
            .save(this.vault.format.history, Credentials.fromPassword("test"))
            .then(() => this.fds.load(Credentials.fromPassword("test")))
            .then(({ Format, history }) => Vault.createFromHistory(history, Format))
            .then((vault) => {
                const entry = vault.findEntriesByProperty("title", "Test")[0];
                expect(entry.getProperty("username")).to.equal("test");
            });
    });

    it("supports reusing the same Credentials instance for both construction and loading (buttercup/buttercup-core#326)", function () {
        // Mirrors the README's documented usage: one Credentials instance
        // used both to construct the datasource and, later, to load with.
        // Previously, the constructor called restrictPurposes() on this
        // shared-by-id instance, silently stripping PURPOSE_DECRYPT_VAULT
        // and breaking the second call with "Provided credentials don't
        // allow vault decryption".
        const datasourceCredentials = Credentials.fromDatasource(
            { path: this.fds._filename },
            "test"
        );
        const fds2 = new FileDatasource(datasourceCredentials);
        return this.fds
            .save(this.vault.format.history, datasourceCredentials)
            .then(() => fds2.load(datasourceCredentials))
            .then(({ Format, history }) => Vault.createFromHistory(history, Format))
            .then((vault) => {
                const entry = vault.findEntriesByProperty("title", "Test")[0];
                expect(entry.getProperty("username")).to.equal("test");
            });
    });

    describe("saving the vault file (buttercup/buttercup-desktop#1233)", function () {
        const save = (fds, vault = this.vault) =>
            fds.save(vault.format.history, Credentials.fromPassword("test"));

        afterEach(function () {
            sinon.restore();
        });

        it("leaves no temporary files behind", async function () {
            await save(this.fds, this.vault);
            await save(this.fds, this.vault);
            expect(fs.readdirSync(this.fds.baseDir)).to.deep.equal(["vault.bcup"]);
        });

        it("keeps the previous vault intact when writing fails", async function () {
            await save(this.fds, this.vault);
            const before = fs.readFileSync(this.fds.path, "utf8");
            this.vault.findEntriesByProperty("title", "Test")[0].setProperty("username", "changed");
            sinon.stub(fs.promises, "rename").rejects(new Error("disk full"));
            let error;
            try {
                await save(this.fds, this.vault);
            } catch (err) {
                error = err;
            }
            expect(error?.message).to.equal("disk full");
            expect(fs.readFileSync(this.fds.path, "utf8")).to.equal(before);
            expect(fs.readdirSync(this.fds.baseDir)).to.deep.equal(["vault.bcup"]);
        });

        it("writes in place when the vault can't be replaced", async function () {
            await save(this.fds, this.vault);
            this.vault.findEntriesByProperty("title", "Test")[0].setProperty("username", "changed");
            sinon
                .stub(fs.promises, "rename")
                .rejects(
                    Object.assign(new Error("EPERM: operation not permitted"), { code: "EPERM" })
                );
            await save(this.fds, this.vault);
            sinon.restore();
            const { Format, history } = await this.fds.load(Credentials.fromPassword("test"));
            const vault = Vault.createFromHistory(history, Format);
            expect(
                vault.findEntriesByProperty("title", "Test")[0].getProperty("username")
            ).to.equal("changed");
            expect(fs.readdirSync(this.fds.baseDir)).to.deep.equal(["vault.bcup"]);
        });

        it("refuses to save over a read-only vault file", async function () {
            if (process.getuid?.() === 0) {
                // root writes read-only files anyway
                this.skip();
            }
            await save(this.fds, this.vault);
            const before = fs.readFileSync(this.fds.path, "utf8");
            fs.chmodSync(this.fds.path, 0o444);
            try {
                let error;
                try {
                    await save(this.fds, this.vault);
                } catch (err) {
                    error = err;
                }
                expect(error?.code).to.be.oneOf(["EACCES", "EPERM"]);
                expect(fs.readFileSync(this.fds.path, "utf8")).to.equal(before);
            } finally {
                fs.chmodSync(this.fds.path, 0o644);
            }
        });

        it("keeps the vault file's permissions", async function () {
            if (process.platform === "win32") {
                this.skip();
            }
            await save(this.fds, this.vault);
            fs.chmodSync(this.fds.path, 0o600);
            await save(this.fds, this.vault);
            expect(fs.statSync(this.fds.path).mode & 0o777).to.equal(0o600);
        });
    });

    it("supports writing and reading attachments", function () {
        const attachmentText = "This is a sample string,\nwith irrelevant contents.";
        const buff = Buffer.from(attachmentText);
        const vaultID = this.vault.id;
        const attachmentID = uuid();
        return this.fds
            .putAttachment(vaultID, attachmentID, buff, Credentials.fromPassword("test"))
            .then(() =>
                this.fds.getAttachment(vaultID, attachmentID, Credentials.fromPassword("test"))
            )
            .then((buff2) => {
                expect(buff2.equals(buff)).to.be.true;
            });
    });
});
