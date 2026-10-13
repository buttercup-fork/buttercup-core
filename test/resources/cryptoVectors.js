// Encrypted with iocane 5.2.0 using a fixed salt and IV, see test/unit/env/crypto.spec.js
// for how the format works. Shared by the NodeJS and the browser specs.

export const PASSWORD = "correct horse battery staple";
export const TEXT = 'Buttercup vault üñîçødé ✓ ความคุ้มค่า {"k":[1,2,3]}';

export const VECTORS = {
    "AES-CBC, 5,000 rounds":
        "VwCXnkN+pKZ5YDEFBNx+tr1atuaptPfvweILEuyisaheY0pjHFn2v38QHLq8vEHcQNN0GrssMcUEjwe2rR7llNyjfHvH8mYhp2zFzwURDbuAXW5nZ536E8+WJ1UezGjD$00112233445566778899aabbccddeeff$kat-salt-cbc1$034873f158b8988a5a191cc64dccf7f2e7e93715ce720e7796d6ffa859bf0581$5000$cbc",
    "AES-GCM, 5,000 rounds":
        "5CLwxb03Sr8K6FmC+XPCqSzYd2Xjz3ADG43Pi/gHxM2oB5BTZA3/zHtFAOLa/qe2OZHYW6rBmfymjzl6jZ/RQXDCYC+eKpqlJQupAmDYDD/6$ffeeddccbbaa99887766554433221100$kat-salt-gcm1$2aff45bba4869307c04ca5e60d96356b$5000$gcm",
    "AES-GCM, 250,000 rounds (current default)":
        "n6UI1FVBuCl6m9+iVU4NZ1qglk6dBpRLZXT9TaqY4l+MDZRf/VH6B5lW7D6MY+RBMPoX6f7xzwBKQapySXdtF5TxVuP7gbZjjGOstdl07Ba9$0102030405060708090a0b0c0d0e0f10$kat-salt-gcm2$5fc1685bde225c282b360c701e834c3e$250000$gcm",
    "AES-CBC, 1,000 rounds, with rounds and method":
        "5zReUyWgkLTjbvlxXVuC6xs/zzZoBTWQJDZFDA43phXrWkYCrYfmszCdgD+rcMO9+3iM//umJnlk55XbC0piaGh4XpHpoRqkVYIxop5LhBzsjcYB6NIZLSaOeiEVS4Cf$a0a1a2a3a4a5a6a7a8a9aaabacadaeaf$kat-salt-old1$808aeb53c5e7e52b695008945f97e74a2aa48882c61f15602d161e986de1106d$1000$cbc",
    "older four-part string (CBC, 1,000 rounds implied)":
        "5zReUyWgkLTjbvlxXVuC6xs/zzZoBTWQJDZFDA43phXrWkYCrYfmszCdgD+rcMO9+3iM//umJnlk55XbC0piaGh4XpHpoRqkVYIxop5LhBzsjcYB6NIZLSaOeiEVS4Cf$a0a1a2a3a4a5a6a7a8a9aaabacadaeaf$kat-salt-old1$808aeb53c5e7e52b695008945f97e74a2aa48882c61f15602d161e986de1106d"
};

// Binary data (the "iocane/2" packing): the bytes 0 to 255, twice. 512 bytes, so every value
// appears, including the 0x01 0x00 start of the packing's own border marker.
export const BINARY_DATA = Uint8Array.from({ length: 512 }, (_, i) => i % 256);

export const BINARY_VECTORS = {
    "AES-GCM, 5,000 rounds":
        "aW9jYW5lLzIAAABdeyJpdiI6IjExMTIxMzE0MTUxNjE3MTgxOTFhMWIxYzFkMWUxZjIwIiwic2FsdCI6ImthdC1zYWx0LWJnY20iLCJyb3VuZHMiOjUwMDAsIm1ldGhvZCI6ImdjbSJ9AAAACAEAAAAAAAABaL/1rGYf9P9jbTtIyYCtDLMocHgU4OG+3t5/3CoJUQWS2emzAcTbKkqI+2bmww58SABjEAmA3wHabLKKaXLlqKJILmgbdouHzPIehw0BChbSzMa30n6XuhNEq8XgCu31O3AVTLdNmphyUUIRgWy1AJI4hZbjSr7zgbRGt39/Z/JuOQ6nTuPQJ/9BK6u4de6QktiDWndMi5fnih2gUhQijoJbV4iyiEIYYeZCF2fn5KVbHD7yIQ3JRLZymnZywf1flsL4FdqW3dDmyqpGeV+9w6TqY4rKllGedVOwcAc7BZcle3+JbAdRAMa/3K+tInKi5AFDcCEejUG7cjTuA1dy53BrhKEnP0OlC0X+P/RpZyY5yChxZkjw/a2fhtfg8/lwt8T7/x9xPT1+owGw+WV8VAUo/YTvCnpLl7AgyiamP9sH6PJYRxBxij0u5oQhmt8di5euIpfoVrJjNAFzQ/Lb1zKpLk0G7IZ4460fYe6dkKgQig3OmN4nmzdw+Joj5OsbzFb4THutR8Al5MT6KuzQ2puzNi/2ZOh2fZXBeyEHt6hF1E2+wHSqKC44hVdj5C3nCUtmw1a7LIkkbsBHYNk46bluJZizHz3Sh952Mku2pOgoe8BVDsdlLNavRwiEuvnmNn1JFNa3rF1gzhazXTiItCJorzt7uWUyn+gJ/BL3khwBAAAAAAAAAQAAACt7ImF1dGgiOiIwMGFjMDRhYzk3ZTBjZTk1NmRiNmZjNTY4NmRjZmMyMCJ9",
    "AES-CBC, 5,000 rounds":
        "aW9jYW5lLzIAAABdeyJpdiI6IjIxMjIyMzI0MjUyNjI3MjgyOTJhMmIyYzJkMmUyZjMwIiwic2FsdCI6ImthdC1zYWx0LWJjYmMiLCJyb3VuZHMiOjUwMDAsIm1ldGhvZCI6ImNiYyJ9AAAACAEAAAAAAAABx/bNZ4COaVUYslbkYtGoNQwwSbkCyl3Vj5CTm1LGYCIwFJ32rzYtfgiREvD3bNGPv68i6/+RevNq8WEJrgxOR44HMpv6Ptwqos5N6d9L9R61jcsWlJFwXTBfpLdJouLC5Qh25DI5+NDl8+LUQWnO5mHFZltrQ6EsV3mf8PpJstuN3HnmoaMbAwd0Q9ZJethOS+9neSfSV0ArqC5x42uJj0Zv4QpLmY4qIzCo0N/QXxgRL6/phJM8iw7vf0ryEVtyXFTWZG30AYBBsMXhIqscIPHYOzX/oB3WgTB/Zp5ZSEUT/GkZIKy03A0XCMIp4h9faLHcOCIUH+11AHPfeoeHz3XRaLPchMCZAPhYK+3MCk8v2YgBcSnAlU7JFlZKg+2Uk5HsCc7GNeLq90wIiC0yhAUll07Ab8/7ytoEgwT1YopmGJv0esj0lyKvVcuPPyqTwdZQuoMdEoSk+x7IkrG8FoNIT1rYBrRUFkcwdtEgw+gaW5babZMzV/hMbQWiq60X5M7RofjqRsnAupSYDol6dtEPix55p69XYHHFfqn1dv5owba7M7UBOcZS0dRVqxG7Q1DpUV1lnPiDdYATUuuS0Bd6XwdDHVnoimmY4FjJDXzHf8xsa3WIyoLrZpUcQLWnumxlFi1u/DOKAQDHc4O4q+gVHr1sfyM5sYQufc4pt/E1P9BQnnnbVNI87v7VEOkXAQAAAAAAAAEAAABLeyJhdXRoIjoiZjAzM2M2YmRhMzVmYzc1ZmZjYzEzNjNkNDEzMGNlNGE5NjQ4OWVmYmFlMTBhZWE1YmQzM2NkYWY5YjY5MGVhZiJ9"
};

// Malformed variants of a text vector. NodeJS and WebCrypto used to disagree about some of these
// (a longer tag that swallowed the end of the content opened in the browser only, an invalid
// base64 character opened on NodeJS only), so every one must be refused on both.
export function malformedVariants(vector) {
    const [content, iv, salt, auth, rounds, method] = vector.split("$");
    // atob and btoa, not Buffer: this file is bundled for the browser specs too
    const binary = atob(content);
    const join = (parts) => parts.join("$");
    const variants = {
        "a tag that is shorter": join([content, iv, salt, auth.slice(0, 24), rounds, method]),
        "an empty tag": join([content, iv, salt, "", rounds, method]),
        "a tag that is not hex": join([content, iv, salt, `${auth.slice(2)}zz`, rounds, method]),
        "an IV that is shorter": join([content, iv.slice(0, 24), salt, auth, rounds, method]),
        "an IV that is longer": join([content, `${iv}${iv}`, salt, auth, rounds, method]),
        "an empty IV": join([content, "", salt, auth, rounds, method]),
        "an IV that is not hex": join([content, `${iv.slice(2)}zz`, salt, auth, rounds, method]),
        "an invalid base64 character in the content": join([
            `${content.slice(0, 8)}!${content.slice(8)}`,
            iv,
            salt,
            auth,
            rounds,
            method
        ]),
        "a line break in the content": join([
            `${content.slice(0, 8)}\n${content.slice(8)}`,
            iv,
            salt,
            auth,
            rounds,
            method
        ])
    };
    if (method === "gcm") {
        // The same sealed bytes (content + tag), cut at another place
        variants["a longer tag that took the end of the content"] = join([
            btoa(binary.slice(0, -4)),
            iv,
            salt,
            `${[...binary.slice(-4)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")}${auth}`,
            rounds,
            method
        ]);
    }
    return variants;
}
