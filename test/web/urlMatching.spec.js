import { MemoryStorageInterface, Vault, VaultEntrySearch } from "../../source/index.web.js";
import { URL_MATCHING_CASES } from "../resources/urlMatchingCases.js";

// The same table as the Node spec: Node and browsers parse URLs differently
// (host normalisation, punycode), so the matcher is checked in each browser
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
