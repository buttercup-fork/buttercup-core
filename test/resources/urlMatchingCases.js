/**
 * [entry URL, page URL, should the entry be offered on the page]
 * Hosts are compared label by label, never as string suffixes. Today's subdomain
 * behaviour (in both directions), the scheme and the port are unchanged (B-621).
 * Shared by the Node spec (test/integration/search/urlMatching.spec.js) and the
 * browser spec (test/web/urlMatching.spec.js): Node and browsers parse URLs
 * differently, so the same table runs in both.
 */
export const URL_MATCHING_CASES = [
    // Wrong sites: a string suffix is not a parent domain
    ["paypal.com", "https://mypaypal.com/", false],
    ["https://example.com/login", "https://evilexample.com/", false],
    ["bank.co.nz", "https://notbank.co.nz/", false],
    ["evilexample.com", "https://example.com/", false],
    ["mybank.com", "https://bank.com/", false],
    ["login.victim.com", "https://ictim.com/", false],
    ["https://example.com@evil.com/", "https://example.com/", false],
    // IP addresses and localhost match exactly
    ["1.2.3.4", "http://11.2.3.4/", false],
    ["11.2.3.4", "http://1.2.3.4/", false],
    ["1.2.3.4", "http://1.2.3.4/login", true],
    ["localhost", "http://foo.localhost/", false],
    ["foo.localhost", "http://localhost/", false],
    ["localhost", "http://localhost:3000/", false],
    ["http://localhost:3000/", "http://localhost:3000/app", true],
    // Matches that stay as they are
    ["example.com", "https://example.com/", true],
    ["https://example.com/login", "https://www.example.com/account", true],
    ["https://example.com", "https://a.b.example.com/", true],
    ["a.example.com", "https://example.com/", true],
    ["bank.co.nz", "https://www.bank.co.nz/", true],
    ["https://example.com:8443/", "https://example.com:8443/x", true],
    ["https://example.com@evil.com/", "https://evil.com/", true],
    // Host normalisation: case, trailing dot, punycode
    ["Example.COM", "https://example.com/", true],
    ["https://example.com/", "https://EXAMPLE.com./", true],
    ["https://münchen.example/", "https://xn--mnchen-3ya.example/", true],
    ["https://xn--mnchen-3ya.example/", "https://münchen.example/", true],
    ["https://münchen.example/", "https://xn--chen-3ya.example/", false],
    ["https://example.com./", "https://example.com/", true],
    ["https://example.com./", "https://www.example.com./", true],
    ["MÜNCHEN.example", "https://münchen.example./", true],
    ["https://münchen.example/", "https://www.xn--mnchen-3ya.example/", true],
    ["https://www.münchen.example/", "https://xn--mnchen-3ya.example/", true],
    ["https://münchen.example/", "https://evilxn--mnchen-3ya.example/", false]
];
