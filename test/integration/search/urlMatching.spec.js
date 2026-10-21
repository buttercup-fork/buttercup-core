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
