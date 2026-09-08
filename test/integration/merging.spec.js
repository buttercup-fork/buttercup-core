import { expect } from "chai";
import {
    Credentials,
    Vault,
    VaultFormatB,
    VaultManager,
    VaultSource,
    setDefaultFormat
} from "../../dist/node/index.js";

describe("merging", function () {
    beforeEach(async function () {
        setDefaultFormat(VaultFormatB);
        const creds = Credentials.fromDatasource(
            {
                type: "memory",
                property: `test:${Math.floor(Math.random() * 100000)}`
            },
            "test"
        );
        const credsStr = await creds.toSecureString();
        this.vaultManager = new VaultManager({
            autoUpdate: false
        });
        this.source = new VaultSource("Test", "memory", credsStr);
        await this.vaultManager.addSource(this.source);
        await this.source.unlock(Credentials.fromPassword("test"), { initialiseRemote: true });
        this.vault = this.source.vault;
        // Create common
        this.group = this.vault.createGroup("Main");
        this.group.setAttribute("test", "test");
        this.group2 = this.vault.createGroup("Secondary");
        this.group3 = this.group.createGroup("Child");
        this.entry = this.group
            .createEntry("Item")
            .setProperty("username", "test")
            .setProperty("password", "test")
            .setProperty("URL", "testing")
            .setAttribute("test", "test");
        this.vault.setAttribute("test", "test");
        await this.source.save();
        const newLoaded = await this.source._datasource.load(Credentials.fromPassword("test"));
        this.stagedVault = Vault.createFromHistory(newLoaded.history, newLoaded.Format);
        this.saveAll = async () => {
            await this.source._datasource.save(
                this.stagedVault.format.history,
                Credentials.fromPassword("test")
            );
            await this.source.save();
        };
    });

    afterEach(function () {
        setDefaultFormat();
    });

    it("merges vault attributes", async function () {
        this.stagedVault.setAttribute("test", "changed");
        this.stagedVault.setAttribute("new", "set");
        this.vault.setAttribute("later", "test");
        await this.saveAll();
        expect(this.vault.getAttribute("test")).to.equal("changed");
        expect(this.vault.getAttribute("new")).to.equal("set");
        expect(this.vault.getAttribute("later")).to.equal("test");
    });

    it("keeps a deleted entry property deleted across later merges", async function () {
        // buttercup/buttercup-desktop#1342: deleting a custom field appeared to
        // work but the field reappeared after a subsequent save, because the
        // merge dropped the property's deletion tombstone.
        this.entry.deleteProperty("URL");
        await this.source.save();
        expect(this.entry.getProperty("URL")).to.be.undefined;
        // Make an unrelated change and save again - the deletion must survive.
        this.entry.setProperty("username", "test2");
        await this.source.save();
        expect(this.entry.getProperty("URL")).to.be.undefined;
        expect(this.entry.getProperty("username")).to.equal("test2");
    });

    it("does not duplicate a renamed entry property after a merge", async function () {
        this.entry.setProperty("renamed", this.entry.getProperty("URL"));
        this.entry.deleteProperty("URL");
        await this.source.save();
        this.entry.setProperty("username", "test2");
        await this.source.save();
        expect(this.entry.getProperty("URL")).to.be.undefined;
        expect(this.entry.getProperty("renamed")).to.equal("testing");
    });

    it("handles large amounts of divergence", async function () {
        const count = 300;
        for (let i = 0; i < count; i += 1) {
            const sg1 = this.stagedVault.createGroup(`SG ${i}`);
            sg1.createEntry(`SE ${i}`)
                .setProperty("username", `user ${i}`)
                .setProperty("password", `pass${i}`);
            const og1 = this.vault.createGroup(`G ${i}`);
            og1.createEntry(`E ${i}`)
                .setProperty("username", `user ${i}`)
                .setProperty("password", `pass${i}`);
        }
        await this.saveAll();
        const originalCount = this.vault.format.getAllEntries().length;
        expect(originalCount).to.be.above(count * 2);
    });
});
