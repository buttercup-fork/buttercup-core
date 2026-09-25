import { join } from "path";
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
