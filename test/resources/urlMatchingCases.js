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
    ["https://münchen.example/", "https://evilxn--mnchen-3ya.example/", false],
    // The authority ends at the first / ? # or \ (a browser reads \ as /), so none of these
    // can smuggle another host in. Page side (the page URL is not in serialised form):
    ["example.com", "https://evil.com?@example.com", false],
    ["example.com", "https://evil.com?.example.com", false],
    ["example.com", "https://evil.com#@example.com", false],
    ["example.com", "https://evil.com#.example.com", false],
    ["example.com", "https://evil.com\\.example.com", false],
    ["example.com", "https://evil.com\\@example.com", false],
    ["example.com", "https://example.com\\@evil.com", true],
    ["evil.com", "https://example.com\\@evil.com", false],
    ["example.com", "https://example.com/a@evil.com", true],
    ["evil.com", "https://example.com/a@evil.com", false],
    ["example.com", "https://example.com?next=https://evil.com/", true],
    ["evil.com", "https://example.com?next=https://evil.com/", false],
    // Entry side (a stored entry URL is whatever was typed or imported):
    ["https://evil.com?@example.com", "https://example.com/", false],
    ["https://evil.com?.example.com", "https://example.com/", false],
    ["https://evil.com#@example.com", "https://example.com/", false],
    ["https://evil.com#.example.com", "https://example.com/", false],
    ["https://evil.com\\.example.com", "https://example.com/", false],
    ["https://evil.com\\@example.com", "https://example.com/", false],
    ["https://example.com\\@evil.com", "https://evil.com/", false],
    ["https://example.com\\@evil.com", "https://example.com/", true],
    ["https://evil.com?@example.com", "https://evil.com/", true],
    ["https://example.com/a@evil.com", "https://evil.com/", false],
    ["https://example.com?next=https://evil.com/", "https://evil.com/", false],
    // Entries that carry a query, fragment, port, user info or backslash still match their own host
    ["https://example.com?x=1", "https://example.com/", true],
    ["https://example.com#frag", "https://www.example.com/", true],
    ["https://example.com\\login", "https://example.com/", true],
    ["https://example.com:8443?x=1", "https://example.com:8443/", true],
    ["https://example.com:8443#frag", "https://example.com:8443/x", true],
    ["https://example.com:8443?x=1", "https://example.com/", false],
    ["https://user:pw@example.com/path", "https://example.com/", true],
    ["https://user:pw@example.com?x=1", "https://example.com/", true],
    ["https://user@example.com:8443#frag", "https://example.com:8443/", true],
    ["https://a@b@example.com/", "https://example.com/", true],
    ["example.com?x=1", "https://example.com/", true],
    ["example.com", "https://example.com?x=1", true],
    ["example.com", "https://example.com#frag", true],
    // No host at all: nothing to compare, nothing is offered
    ["https://?@example.com", "https://example.com/", false],
    ["https://example.com/", "https://?@example.com", false]
];
