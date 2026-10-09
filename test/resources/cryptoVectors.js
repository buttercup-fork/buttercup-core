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
