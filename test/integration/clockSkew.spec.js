import { expect } from "chai";
import sinon from "sinon";
import {
    Credentials,
    MemoryDatasource,
    Vault,
    VaultFormatB,
    VaultManager,
    VaultSource,
    setDefaultFormat
} from "../../dist/node/index.js";

// Wall-clock time can go backwards (NTP corrections, VM/WSL clock sync,
// users fixing their clock). Format B merges keep the value with the later
// timestamp, so edits made after the clock stepped back must still win.

const START = Date.UTC(2026, 0, 1, 12, 0, 0);
const STEP_BACK = 5000;

async function createSource() {
    const property = `clock${Math.random()}`;
    const vault = new Vault();
    vault
        .createGroup("General")
        .createEntry("Login")
        .setProperty("username", "user")
        .setProperty("pin", "1234");
    const mds = new MemoryDatasource(
        Credentials.fromDatasource({ type: "memory", property }, "test")
    );
    await mds.save(vault.format.getHistory(), Credentials.fromPassword("test"));
    const credentials = Credentials.fromDatasource({ type: "memory", property }, "test");
    const source = new VaultSource("Test", "memory", await credentials.toSecureString());
    const manager = new VaultManager({ autoUpdate: false });
    await manager.addSource(source);
    await source.unlock(Credentials.fromPassword("test"));
    return source;
}

async function reopen(source) {
    await source.lock();
    await source.unlock(Credentials.fromPassword("test"));
    const [entry] = source.vault.findEntriesByProperty("title", "Login");
    return entry;
}

describe("clock going backwards (Format B)", function () {
    beforeEach(function () {
        setDefaultFormat(VaultFormatB);
        // Only fake Date - crypto and timers must keep working normally
        this.clock = sinon.useFakeTimers({ now: START, toFake: ["Date"] });
    });

    afterEach(function () {
        this.clock.restore();
        setDefaultFormat();
    });

    it("keeps an edit made after the clock stepped back", async function () {
        const source = await createSource();
        this.clock.setSystemTime(START - STEP_BACK);
        const [entry] = source.vault.findEntriesByProperty("title", "Login");
        entry.setProperty("username", "user2");
        // Saving merges with the stored copy, which holds the older "user"
        await source.save();
        const reopened = await reopen(source);
        expect(reopened.getProperty("username")).to.equal("user2");
    });

    it("keeps a deletion made after the clock stepped back", async function () {
        const source = await createSource();
        // Another device's copy, from before the deletion
        const otherCopy = [...source.vault.format.history];
        this.clock.setSystemTime(START - STEP_BACK);
        const [entry] = source.vault.findEntriesByProperty("title", "Login");
        entry.deleteProperty("pin");
        const merged = Vault.createFromHistory(
            VaultFormatB.vaultFromMergedHistories(otherCopy, source.vault.format.history).format
                .history,
            VaultFormatB
        );
        const [mergedEntry] = merged.findEntriesByProperty("title", "Login");
        expect(mergedEntry.getProperty("pin")).to.be.undefined;
    });

    it("keeps a property re-added after the clock stepped back past its deletion", async function () {
        const source = await createSource();
        const [entry] = source.vault.findEntriesByProperty("title", "Login");
        entry.deleteProperty("pin");
        await source.save();
        this.clock.setSystemTime(START - STEP_BACK);
        entry.setProperty("pin", "5678");
        await source.save();
        const reopened = await reopen(source);
        expect(reopened.getProperty("pin")).to.equal("5678");
    });
});

describe("re-adding a deleted property (Format B)", function () {
    beforeEach(function () {
        setDefaultFormat(VaultFormatB);
    });

    afterEach(function () {
        setDefaultFormat();
    });

    it("is visible immediately, without needing a merge", function () {
        const vault = new Vault();
        const entry = vault.createGroup("General").createEntry("Login");
        entry.setProperty("pin", "1234");
        entry.deleteProperty("pin");
        expect(entry.getProperty("pin")).to.be.undefined;
        entry.setProperty("pin", "5678");
        expect(entry.getProperty("pin")).to.equal("5678");
    });

    it("also applies to attributes", function () {
        const vault = new Vault();
        const entry = vault.createGroup("General").createEntry("Login");
        entry.setAttribute("custom", "a");
        entry.deleteAttribute("custom");
        entry.setAttribute("custom", "b");
        expect(entry.getAttribute("custom")).to.equal("b");
    });
});
