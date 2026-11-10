import { expect } from "chai";
import { MemoryStorageInterface, Vault, VaultEntrySearch } from "../../../dist/node/index.js";
import { extractDomain, parseHost } from "../../../dist/node/search/BaseSearch.js";
import { URL_MATCHING_CASES } from "../../resources/urlMatchingCases.js";

describe("VaultEntrySearch URL matching", function () {
    for (const [entryURL, pageURL, shouldMatch] of URL_MATCHING_CASES) {
        it(`${shouldMatch ? "offers" : "does not offer"} an entry for ${entryURL} on ${pageURL}`, async function () {
            const vault = new Vault();
            vault.createGroup("Sites").createEntry("Site").setProperty("url", entryURL);
            const search = new VaultEntrySearch([vault], new MemoryStorageInterface());
            await search.prepare();
            const titles = search.searchByURL(pageURL).map((res) => res.properties.title);
            expect(titles).to.deep.equal(shouldMatch ? ["Site"] : []);
        });
    }
});

describe("VaultEntrySearch URL matching on pages that are not http or https", function () {
    // Not in the shared table: the host extraction spec below needs URLs whose host the
    // URL parser reads the same way, and these have none or another scheme (B-621)
    const pages = [
        "ws://bank.example/",
        "wss://bank.example/",
        "javascript:bank.example",
        "about:blank",
        "about:srcdoc",
        "blob:https://bank.example/x",
        "view-source:http://bank.example/",
        "file:///C:/x",
        "data:text/html,x",
        "ftp:1.2.3.4"
    ];
    for (const pageURL of pages) {
        it(`offers nothing on ${pageURL}`, async function () {
            const vault = new Vault();
            const group = vault.createGroup("Sites");
            for (const entryURL of [
                "bank.example",
                "http://bank.example/",
                "https://bank.example/",
                "about:blank",
                "1.2.3.4"
            ]) {
                group.createEntry(entryURL).setProperty("url", entryURL);
            }
            const search = new VaultEntrySearch([vault], new MemoryStorageInterface());
            await search.prepare();
            expect(search.searchByURL(pageURL)).to.deep.equal([]);
        });
    }
});

describe("VaultEntrySearch URL matching: schemeless host:port and entries with several URLs", function () {
    // Not in the shared table: the URL parser reads "localhost:3000" as a scheme with no host
    const cases = [
        [{ url: "localhost:3000" }, "http://localhost:3000/", true],
        [{ url: "192.168.1.1:8080" }, "https://192.168.1.1:8080/", true],
        [{ url: "https://bank.example:8443/" }, "bank.example:8443", false],
        // Each URL of an entry is checked on its own: an http or schemeless one still matches
        [
            { url: "https://bank.example/", loginURL: "https://bank.example/login" },
            "http://bank.example/",
            false
        ],
        [
            { url: "https://bank.example/", loginURL: "http://bank.example/login" },
            "http://bank.example/",
            true
        ]
    ];
    for (const [properties, pageURL, shouldMatch] of cases) {
        it(`${shouldMatch ? "offers" : "does not offer"} ${JSON.stringify(properties)} on ${pageURL}`, async function () {
            const vault = new Vault();
            const entry = vault.createGroup("Sites").createEntry("Site");
            for (const [key, value] of Object.entries(properties)) entry.setProperty(key, value);
            const search = new VaultEntrySearch([vault], new MemoryStorageInterface());
            await search.prepare();
            const titles = search.searchByURL(pageURL).map((res) => res.properties.title);
            expect(titles).to.deep.equal(shouldMatch ? ["Site"] : []);
        });
    }
});

describe("VaultEntrySearch URL host extraction", function () {
    const urls = new Set(URL_MATCHING_CASES.flatMap(([entryURL, pageURL]) => [entryURL, pageURL]));
    for (const url of urls) {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (err) {
            // Not a URL a browser would parse (no scheme, no host): nothing to compare with
            continue;
        }
        it(`reads the same host and port as the URL parser from ${url}`, function () {
            const host = parseHost(extractDomain(url));
            expect(host.labels.join(".")).to.equal(parsed.hostname.replace(/\.$/, ""));
            expect(host.port).to.equal(parsed.port);
        });
    }
});
