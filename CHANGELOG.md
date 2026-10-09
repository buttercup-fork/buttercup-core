# Core library changelog

## Unreleased (codekunde fork)

 * **Breaking**:
   * Requires NodeJS 22 or newer (was 14+). NodeJS 14 to 20 are end-of-life and no longer receive security fixes (20 since April 2026), and current releases of several dependencies need 22+. CI now tests on NodeJS 22 and 24
 * **Security**:
   * Vault encryption no longer depends on the unmaintained `iocane` package (last release 2023-12) or on `pbkdf2`, `duplexer` and `stream-each`: it lives in `source/crypto` and uses NodeJS' `node:crypto` and the browsers' WebCrypto directly. The format is unchanged byte for byte: every earlier vault (AES-CBC with HMAC, AES-GCM, the older four-part strings, binary attachments) still opens, and new encryption is still AES-256-GCM with PBKDF2-SHA256, so earlier versions can read what this one writes. Known-answer vectors and an independent `node:crypto` reference decryptor pin the format, and differential tests check it against `iocane` (now a dev dependency) in both directions, in NodeJS and in the browser. A vault that asks for more than 10,000,000 derivation rounds is refused before any key is derived (the count is read from the unauthenticated header)
   * The browser/React Native build's `crypto/v1/randomString` never filled its array of random values, so it returned one character repeated (`AAAA...`). Its only caller makes the 48-character attachments key, so a vault whose attachments were first added by a web-build app got a publicly known attachments key. It now draws from `crypto.getRandomValues` (unbiased) and throws if that is missing. NodeJS (desktop) was not affected. Vaults that already hold an all-one-character attachments key are not re-keyed yet
   * `pbkdf2` override raised to `^3.1.7` (3.1.6 and older: a long password is rehashed on every iteration, a denial of service); production `npm audit` is clean
   * Cleared 9 of 10 `npm audit` findings (5 critical, 2 high, 2 moderate, 1 low) via `overrides`: `pbkdf2` (used by `iocane` for vault key derivation), `sha.js`, `min-document`, and a nested `webdav > minimatch` override. The remaining `uuid` finding is fixed by the bump below.
   * `npm audit` is now clean (0 findings). Bumped `uuid` 9 → 14 (GHSA-w5hq-g745-h8pq; used only for internal ID generation, not part of the public API; now ESM-only, imported the same way in the NodeJS and web builds). Dev tooling: `mocha` 10 → 12 (its `serialize-javascript` dependency had a high-severity RCE advisory, GHSA-5c6j-r48x-rmvq), and test coverage moved from `nyc` to `c8` (V8's built-in coverage), since even the latest `nyc` still depends on a vulnerable `uuid` through `istanbul-lib-processinfo`. `nyc` never measured the ESM build (its reports were 0%), so coverage is now a separate `npm run test:coverage`; `test:node` runs without instrumentation, as before.
   * Raised the PBKDF2 derivation round count from 125,000 to 250,000 (`CRYPTO_PBKDF2_ROUNDS`), matching `iocane`'s own built-in default and OWASP's compromise range. Fully backwards compatible - the round count is stored per-vault in the encrypted blob's own header, so existing vaults keep decrypting exactly as before; only new saves pick up the higher count (buttercup/buttercup-core#325).
   * Switched default vault encryption from AES-CBC (+ separate HMAC-SHA256) to AES-GCM, an authenticated cipher with hardware acceleration and a smaller/simpler attack surface. Also backwards compatible for the same reason - the algorithm used is stored per-vault in the header, so existing CBC-encrypted vaults keep decrypting fine (buttercup/buttercup-core#201).
 * **Features**:
   * Sign-in entries: an entry for an account you sign in to with another account (eg. "Sign in with Google") can point to that account's entry - `Entry#setLoginEntry(entry | null)`, `getLoginEntry()`, `getLoginEntryLink()` (`{ entryID, title }`, also when broken) and `isLoginEntryBroken()`, plus `Vault#findEntriesUsingLogin(entry)`. The link is stored in a `BC_ENTRY_LOGIN_ENTRY` attribute with a copy of the linked entry's title, refreshed on save, so a broken link (entry trashed or deleted) can still name it. Links to the entry itself, another vault, Trash, or that would loop are refused. New `Vault#findEntriesLinkingTo(entry)` finds every entry that signs in with an entry or has fields linked to its fields, eg. to warn before deleting it. Usage in `docs/GUIDE.md`, "Signing in with another entry" (buttercup/buttercup-core#318)
   * Password expiry: an entry's password can expire a number of days after it was last changed - `Entry#setPasswordExpiry(days)` (`null` removes it), `getPasswordExpiry()`, `getPasswordExpiryTime()`, `hasExpiredPassword(at = now)`, and `Vault#findEntriesByExpiredPassword(at = now)` (outside of Trash; pass a later time for passwords expiring soon). Setting the password to a new value, directly or through an entry facade, stores the change time as a UTC timestamp in a `BC_ENTRY_PASSWORD_CHANGED` attribute (`getPasswordChangedTime()`), which starts the period again; for passwords last changed before that, `setPasswordExpiry` starts the period from now. The period is stored in a `BC_ENTRY_PASSWORD_EXPIRY` attribute. A linked password uses the linked entry's change time. Vault insights gain an `expiredPasswords` count (buttercup/buttercup-core#163)
   * Single-use passwords: an entry can hold a list of passwords used once each, in order (eg. transaction numbers) - `Entry#setSingleUsePasswords(passwords)`, `popSingleUsePassword()` (discards the current password and moves the next one in, returning it, or `null` when none are left), `getSingleUsePasswords()`, `hasSingleUsePasswords()` and `unsetSingleUsePasswords()`. Following the design in the issue, the current password is the entry's normal `password` field and the rest are queued one per line in a `Single-use passwords` field (`Entry.SingleUsePasswordsProperty`, a password field so apps hide it), with a `BC_ENTRY_SINGLE_USE_PASSWORDS` attribute marking the entry. Used passwords stay in the entry's history. Usage in `docs/GUIDE.md`, "Single-use passwords" (buttercup/buttercup-core#118)
   * Field ordering: an entry's fields can be put in a custom display order - `Entry#setPropertyOrder(property, order)` moves one field and shifts the others along (`Infinity` or past the end moves it last), `setPropertyOrders(properties)` sets the whole order at once (eg. after drag and drop; unlisted fields follow), `getPropertyOrder(property)` (`Infinity` when unset), `getPropertyOrders()` (all property names in order), `hasPropertyOrders()` and `resetPropertyOrders()`. Positions are stored in `BC_ENTRY_FIELD_ORDER:<property>` attributes, as proposed in the issue. Fields without a position, eg. added later, come after the ordered ones, and `deleteProperty` removes a field's position. Entry facades follow the order, and `consumeEntryFacade` saves a new order when fields were moved in the facade (a facade whose fields weren't moved writes nothing). Usage in `docs/GUIDE.md`, "Ordering fields" (buttercup/buttercup-core#165)
   * Recovery codes fields: a field can hold a list of recovery codes (eg. 2FA backup codes), each of which can be marked as used - `Entry#setRecoveryCodes(property, codes?)` (without codes, converts the field's current value, one code per line), `getRecoveryCodes(property)` (`[{ code, used }]`), `markRecoveryCodeUsed(property, code, used = true)`, `isRecoveryCodesProperty(property)` and `unsetRecoveryCodes(property)`. The codes are stored one per line as the field's value and the field becomes a password field, so apps without recovery codes support still hide it. Used codes are kept in a `BC_ENTRY_RECOVERY_CODES:<property>` attribute, and stay marked when the list is edited as long as the code is still in it. Usage in `docs/GUIDE.md`, "Storing recovery codes" (buttercup/buttercup-core#317)
   * `Group#getAllEntries()` and `Group#getAllGroups()`: every entry or group inside a group, including its sub-groups at any depth, matching the existing `Vault#getAllEntries()` / `getAllGroups()` (buttercup/buttercup-core#145)
   * Linked entry fields: a field can show the current value of a field on another entry in the same vault, eg. several logins sharing one Google account's password - `Entry#linkProperty(property, targetEntry, targetProperty?)`, `unlinkProperty(property, { keepValue })`, `getPropertyLink(property)` and `isPropertyLinkBroken(property)`. Linked values are read everywhere values are (`getProperty`, `getProperties`, `getURLs`, facades, search), and a linked password isn't counted as reused in vault insights. Editing a linked field, directly or through a facade, replaces the link with its own value and never changes the other entry. The link is stored in a `BC_ENTRY_PROPERTY_LINK:<property>` attribute, and the field also stores a copy of the value, refreshed on save, so apps without link support still show a real value. If the other entry is trashed or deleted, or loses the field, the link is broken and the field shows its last synced value. Links to another vault, to Trash, to a missing field, or that would loop are refused. Usage in `docs/GUIDE.md`, "Linking a field to another entry" (buttercup/buttercup-core#223)
   * Entry type filters, alongside tags: `Vault#getAllEntryTypes()` (the types in use, eg. for offering filter options) and `Vault#findEntriesByType(type)`, and a `type:<entry type>` search filter for `searchByTerm` (eg. `type:credit_card`, also written `type:creditcard`), which combines with `#tag` filters and search text. Several types match any of them. Unknown types, eg. `type:foo`, are searched as plain text (buttercup/buttercup-core#225)
   * Translated default groups: new vaults can be created with the "General" and "Trash" groups titled in the user's language - `VaultSource#unlock(credentials, { initialiseRemote: true, defaultGroupTitles: { general, trash } })`, or `Vault.createWithDefaults({ groupTitles: { general, trash } })` (it also still takes a vault format on its own, as before). Trash keeps working under any title, since it's identified by its role attribute. Omitted or empty titles fall back to "General"/"Trash"; existing vaults are unchanged (buttercup/buttercup-core#191)
   * Merging sync-service conflict copies: when two devices change a synced vault file at once, services like Dropbox keep the other version as eg. `vault (Jane's conflicted copy 2026-09-24).bcup`. New `findConflictCopies(vaultFilename, filenames)` / `isConflictCopy()` recognise Dropbox, Nextcloud, ownCloud, Syncthing and Seafile conflict names, and the new `VaultSource#mergeFromCredentials(credentials)` merges such a copy into the unlocked vault the same way remote changes are merged on save (the copy may use a different password). It refuses a file that is a different vault (`ErrorCode.VaultMismatch`) or in the other vault format (`ErrorCode.VaultFormatMismatch`, since converting would let the copy's stale values win). Usage in `docs/GUIDE.md`, "Merging conflict copies" (buttercup/buttercup-core#243)
   * Error codes: errors now carry a machine-readable code, read with the new `getErrorCode(err)` export (compare against the exported `ErrorCode` enum) instead of string-matching messages. A wrong password (or tampered vault/attachment content) gives `ErrorCode.DecryptionFailed` - across AES-CBC and AES-GCM vaults, in both NodeJS and the browser, and through `VaultSource#unlock`'s error wrapping. Non-vault content gives `ErrorCode.InvalidVaultSignature`. Existing messages are unchanged apart from a `Failed decrypting vault: ` prefix on decryption failures (buttercup/buttercup-core#66)
   * OneDrive datasource (`OneDriveDatasource`, type `"onedrive"`) using the Microsoft Graph API through the new dedicated `@buttercup/onedrive-client` library (fetch + `hot-patcher`, created via the `net/onedrive/v1/newClient` app-env property, like Dropbox), following the upstream pattern of one small in-house client per storage provider. Vault files are referenced by drive item `fileID` or by `path` (saving to a new path creates the file). Token refresh follows the Google Drive pattern: on a 401, the `DatasourceAuthManager` handlers for `"onedrive"` run and the request is retried once. Optional `endpoint` for national clouds. `@buttercup/onedrive-client` also provides the Microsoft sign-in (`OAuth2Client`, with PKCE) that applications need to obtain tokens (buttercup/buttercup-core#302, #332)
   * Attachment support for `DropboxDatasource` and `GoogleDriveDatasource` (`supportsAttachments()` is now `true` for both). Requests go through each client's own patchable `request` method, so application patches apply to attachments too. Downloads return a `Buffer` in NodeJS and an `ArrayBuffer` in the browser (new `encoding/v1/arrayBufferToBufferLike` app-env property), like WebDAV.
     * Dropbox: stored next to the vault like file/WebDAV vaults (`<vault folder>/.buttercup/<vault ID>/<attachment ID>.bcatt`). Supports the browser "compat" request mode.
     * Google Drive: stored in `/.buttercup/<vault ID>/` at the Drive root. Drive is ID-based, and clients using the `drive.file` scope (eg. the browser extension) can only see files the app created, so attachments live in folders Buttercup creates itself rather than next to the vault. As with vault load/save, a 401 runs the `"googledrive"` auth handlers and retries once. (buttercup/buttercup-core#276, #277)
   * `VaultSource#restoreOfflineCopy()`: after unlocking from the offline copy (`unlock(credentials, { loadOfflineCopy: true })`), writes that copy back to the remote, replacing what is there, eg. a vault file cut off by an interrupted write, and makes the vault editable again. The remote isn't read or merged first, so changes saved elsewhere since the copy was stored are lost. Until now an offline copy could only be viewed: saving it read the damaged remote first and failed, and Format B vaults ignored the read-only flag
   * `VaultSource#lock({ force: true })`: locks without waiting for a save or update that is still running, eg. when a stalled WebDAV or cloud connection never answers. Until now such a request blocked every later save, and the lock, for good, and the vault couldn't be locked until the app restarted. A forced lock drops what was running or queued: those calls reject with the new `ErrorCode.SourceLocked`, and unsaved changes are lost. The request itself can't be cancelled; if it ever finishes, it no longer touches the vault, also after it was unlocked again. `lock()` without `force` still waits, as before
 * **Documentation**:
   * Added a task-oriented usage guide (`docs/GUIDE.md`): creating/opening a vault through `VaultManager`/`VaultSource`, then listing, reading, finding, creating, updating and deleting entries, plus saving/locking and the other storage backends. Every example was run against the real build (buttercup/buttercup-core#298, #342)
   * Generated API reference (`docs/api/`) from the source's TSDoc comments using TypeDoc + `typedoc-plugin-markdown`, via `npm run docs`. This replaces the old `generate:docs` script, which ran `jsdoc2md` over `source/**/*.js` and produced nothing since the source moved to TypeScript. `_`-prefixed internal members are left out. `VaultSourceSaveOptions`, `ConsumeEntryFacadeOptions` and `AppEnvMapper` are now exported (type-only), since public method signatures already referenced them
   * Documented hiding a custom field's value in the apps, like a password: `entry.setPropertyValueType(property, EntryPropertyValueType.Password)`. Field value types, added after the request, already cover it, so no new attribute was added. See `docs/GUIDE.md`, "Hiding a custom field" (buttercup/buttercup-core#136)
 * **Types** (TypeScript `"strict": true` is now on; no runtime changes unless listed under Bugfix):
   * Types that were `any` are now specific, eg. `GoogleDriveDatasource#save` returns `Promise<string>`, `registerDatasource`'s flags are `{ open?: boolean }`, `MemoryStore.attachments` is typed
   * Now include `null` where the value really can be null: `EntryFacade.id` (new facades, like `GroupFacade.id` already), `VaultInsights.longPassLen`/`shortPassLen` (no passwords), `AttachmentManager#getAttachmentDetails` (not found, as documented), `VaultComparator#calculateDifferences` (no common base, as documented), the `VaultFormat` `find*` methods, `EntryChange.ts`/`value` and `FormatBValueHistoryItem` (legacy/converted history)
   * `Entry#getProperty()` gets overloads like `getAttribute()`: no argument returns `PropertyKeyValueObject`, a property name returns `string | undefined`
   * `BaseSearch` is generic (`BaseSearch<Vault>`, `BaseSearch<VaultFacade>`)
   * Unchanged on purpose, to avoid breaking strict apps: `VaultSource#vault` / `#attachmentManager` and `VaultItem#vault` stay non-null although they're `null` while locked/cleaned up
   * Built with TypeScript 6. The NodeJS build type-checks with `moduleResolution: "nodenext"` (Node's real ESM rules), the web build with `"bundler"`, replacing the deprecated `"node"` (removed in TypeScript 7). `eventemitter3` is imported by its named export, which is the same class, so `Vault`, `VaultSource`, `VaultManager` etc. still extend the same `EventEmitter`
 * **Dependencies**:
   * `fuse.js` 6 → 7 (search); same options, search tests unchanged
   * Removed `is-promise`: its one check is now inline
   * `layerr` 2 → 3 (error wrapping): only removes `Layerr#cause()`, which neither core nor the apps call
   * `crypto-random-string` 5 → 6 (NodeJS random strings): same API, needs NodeJS 22+
   * `pako` 1 → 3 (vault compression). pako 2+ dropped "binary string" output, which Format A's compression v1 stores, so core now converts gzip bytes to and from binary strings itself (`source/tools/binaryString.ts`), exactly as pako 1 did. Existing Format A vaults open unchanged, and vaults saved now open with older versions of core. New tests decompress stored pako 1 output. The compressed bytes can differ slightly from pako 1 (newer zlib encoder), but both are standard gzip and decompress to the same text
   * HTTP requests (Dropbox, Google Drive, OneDrive, WebDAV) now use NodeJS's built-in `fetch` instead of `node-fetch`. `@buttercup/dropbox-client` and `@buttercup/googledrive-client` now come from the CodeKunde forks, which use `fetch` directly, and `@buttercup/fetch` is overridden with the CodeKunde fork (0.3.0), which re-exports the built-in `fetch` on every platform. `node-fetch` is still installed because `webdav` lists it as a dependency, but nothing uses it
   * Browser specs run with Web Test Runner instead of Karma, which is deprecated and was the last source of the deprecated `glob` 7, `rimraf` 3 and `inflight`. webpack still bundles the specs with the web build's config (`webpack.test.config.cjs`), so the same code is tested; CI runs them in Chrome and Firefox (Playwright's build) as before. `npm run test:web` locally uses Chrome only
 * **Bugfix**:
   * Setting a field to the value it already has no longer adds a history entry: the field's current value showed up as a "previous value" (eg. right after creating an entry in the desktop app). Applies to entry properties in both formats, and to Format B attributes
   * Format B: a field that was deleted and then set again lost its deletion from `Entry#getChanges`, so the field's history no longer said it had been removed. The deletion is now kept with the value it removed (an optional `deleted` time on the history item), merges keep it, and the value written afterwards counts as created again - the same list as Format A
   * Format B: merging two copies of a vault (eg. on save, after another device changed it) added each field's current value to its own history, so it showed up as a previous value. A merge now only keeps values that really came before
   * Changing a field's type through an entry facade (eg. Note to Password) was undone on save when the field already had a type: the facade also carries the type as a `BC_ENTRY_FIELD_TYPE:<field>` attribute field, applied after the field, which wrote the old type back. That attribute field now follows the field's `valueType` (buttercup-desktop#1218). Renaming or deleting a field (`Entry#deleteProperty`, also through a facade) now removes its type attribute too, so a field added later under the old name no longer inherits the type, and consuming a facade removes type attributes already left behind by fields that no longer exist
   * Locking a vault twice at the same time (eg. from the browser extension while the app also locks it) left it "unlocked" with no vault, and it couldn't be unlocked again until the app restarted ("Source in invalid state (unlocked)"). `VaultSource#lock()` checked the state before queueing, so both calls passed and the second failed half-way. A lock queued behind another one now does nothing (buttercup-desktop#1317)
   * `FileDatasource` no longer leaves a half-written vault file behind: it writes a temporary file next to the vault, flushes it to disk and renames it over the vault. Writing in place left a cut-off vault when the app was killed, the power went or a sync tool copied the file mid-write, and such a vault no longer unlocks ("Failed deriving key: Salt must be provided", [buttercup-desktop#1233](https://github.com/buttercup/buttercup-desktop/issues/1233)). The file's permissions are kept, a read-only vault is still refused, and when the vault can't be replaced (Windows: another program holds it open, after a few retries; or the folder doesn't allow new files) it is written in place as before. `save()` now resolves with the encrypted content, as its type always said.
   * `Vault#emptyTrash()` returned `undefined` instead of the vault when there was no Trash group (documented as returning self)
   * `TextDatasource#hasContent` returned `""` instead of `false` for empty content
   * `VaultFacadeEntrySearch` returned entries in Trash (and in groups inside Trash), unlike `VaultEntrySearch` - upstream left this as a `@todo` with the tests skipped. Trash is now excluded, and the two skipped tests run
   * Saving failed with `TypeError: Cannot read properties of null` after another device permanently deleted an entry or group (deleted from Trash, or skipping Trash) that was still loaded on this device - in both vault formats, and every later save failed the same way until the vault was reopened. Merging in the remote changes left the deleted items behind in the `Vault` with no data. `Vault` now drops items a merge removes
   * `Vault#findEntriesByTag` logged `"SEARCHING"` plus the vault's entire tag map (entry IDs and tags) to the console on every exact-match call - a debug leftover from upstream
   * Format B lost edits and deletions when the system clock went backwards (NTP corrections, VM/WSL clock sync, a user fixing their clock). Merges keep the value with the later timestamp, so an edit stamped earlier than the value it replaced was reverted by the next save's merge, and a deletion stamped earlier than the value's last update was undone. Writes are now always stamped later than the value they replace, and deletions no earlier than its last update, whatever the clock says. This was the cause of intermittent CI failures in `VaultSource` "saves changes" and merging "does not duplicate a renamed entry property" on this fork's CI host, whose clock steps back by around 5s every few tens of seconds
   * Format B: setting a property or attribute that had been deleted left it hidden (its deletion marker wasn't cleared) until a later merge happened to clean it up. Writing a value now un-deletes it
   * Format B vault merge (`mergeValues` / `cloneValue`) discarded each property/attribute's deletion tombstone, so a delete was undone by the next save's merge - deleted entry fields reappeared and renamed fields were duplicated (buttercup/buttercup-desktop#1342)
   * `findGroupsByTitle` threw if a group's title was `undefined` (e.g. a legacy nameless group) (buttercup/buttercup-mobile#153)
   * `VaultFormatB#deleteEntry`/`#deleteGroup` threw when permanently deleting an item (e.g. from Trash) on a vault persisted before deletion tombstones existed, since `execute()` can replace `this.source` wholesale and drop the `del` key (buttercup/buttercup-mobile#334)
   * `isOTPURI` rejected valid `otpauth://` URIs containing a literal space in the label (e.g. `"Slack (workspace)"`) - some real-world OTP QR generators don't percent-encode spaces. Now only rejects newlines (buttercup/buttercup-core#278)
   * `TextDatasource`'s constructor called `restrictPurposes()` on the caller's own `Credentials` instance, silently stripping `PURPOSE_DECRYPT_VAULT`/`PURPOSE_ENCRYPT_VAULT` from it - breaking a later `.load()`/`.save()` call reusing that same instance (exactly the pattern the README's own usage example follows) with `"Provided credentials don't allow vault decryption"`. The call was dead weight (checked nowhere else in the codebase) and has been removed. Also fixed the README's `.then(Vault.createFromHistory)` example, which didn't match `.load()`'s actual `{ Format, history }` return shape (buttercup/buttercup-core#326)
   * Tightened `VaultEntrySearch`'s fuzzy-match threshold (`0.5` → `0.4`) - it was loose enough to return clearly unrelated results (e.g. searching `flickr` could surface `slack.com`, matching on scattered/disjoint characters rather than anything meaningful) (buttercup/buttercup-core#305)
   * `consumeVaultFacade`/`consumeEntryFacade` in merge mode now strip entry attachment attributes (`BC_ENTRY_ATTACHMENT:*`) instead of copying them across - attachment data isn't part of a facade (only its metadata is), so merging an entry from another vault (e.g. importing) left dangling attachment references pointing at data that was never actually transferred (buttercup/buttercup-core#283)
   * Field and attribute names that exist on every JavaScript object (`toString`, `constructor`, `hasOwnProperty`, `valueOf`...) broke vaults. In Format B (the default for new vaults) setting one threw `Cannot read properties of undefined (reading 'unshift')`, so a custom field called `toString` couldn't be saved, and merging or comparing vaults misread them. In Format A a field called `hasOwnProperty` broke reading, deleting and saving. Both formats, and the entry, group and vault getters, facades and merge/compare code, now only look at the vault's own names. `__proto__` can't be stored safely, so setting it now throws an error with the new `ErrorCode.InvalidPropertyName` (vaults that already contain it still open)
   * `VaultFormatA#getEntryChanges` set a deletion's `value` through an always-true condition (`type === Created || Modified`). The output doesn't change (a deletion's `value` is still `null`, as in Format B), but it is now explicit
   * Large vaults and imports were very slow: after every single change (each property or attribute written), `Vault` rescanned all groups and entries with a lookup per item and recomputed every entry's tags, so building or merging a vault was roughly O(n^3). Importing ~2,000 1Password items froze desktop until the OS offered to force-quit (buttercup/buttercup-importer#67). The item lists are now brought up to date when next read, with ID sets, and the tag map is rebuilt only when tags are read. 1,000 entries: 22.6 s → 0.45 s to build and merge; 2,000: 1.6 s
   * Large vaults were still slow to edit: `Entry#getGroup()` searched every entry in the vault for the entry's own record, and `Group#getEntries()` called it for every entry in the vault, so listing one group's entries was O(n^2), and building or applying a vault facade (what desktop does on each save) did that for every group. Both now read the parent ID the entry's record already holds. On a 5,000-entry vault, one edit's facade round trip (create, apply, save) went from about 14 s to 2.4 s
   * `Entry#getChanges` (the entry facade's `_changes`) now means the same in both formats: a field's **previous values**, oldest first, plus a deletion marker. Format A also listed the current value, so the desktop "Previous Value" dialog showed it as a previous one. Format B listed its history newest first and dropped the last value of a deleted field
   * Converting a Format A vault to Format B copied the field history with the current value included and in the wrong order (oldest first, where Format B keeps newest first). Converted history is now previous values only, newest first. Vaults converted before this fix keep their mixed-up history

## v7.7.1
_2024-05-12_

 * **Bugfix**:
   * `group` parameter in `createGroupFacade` was not optional

## v7.7.0
_2024-03-18_

 * WebDAV automatic auth type detection

## v7.6.0
_2024-02-06_

 * `VaultSourceEntrySearch` for searching vault sources rather than vaults/facades

## v7.5.0
_2024-01-29_

 * [#224](https://github.com/buttercup/buttercup-core/issues/224) Entry **tags**

## v7.4.0
_2023-12-09_

 * `Credentials` master password handling upgrade
   * [#336](https://github.com/buttercup/buttercup-core/issues/336) CVE-2023-41646

## v7.3.0
_2023-11-11_

 * Update dependencies

## v7.2.4
_2023-07-16_

 * React-Native entry point in `package.json`

## v7.2.3
_2023-05-12_

 * **Bugfix**:
   * [#333](https://github.com/buttercup/buttercup-core/issues/333): Unable to save Format B vaults ("Cannot read properties of undefined (reading 'e')")

## v7.2.2
_2023-05-12_

 * **Bugfix**:
   * Format B vaults unable to be opened: "Cannot read properties of undefined (reading 'e')"

## v7.2.1
_2023-05-11_

 * Removed Format A merge skipping check (was for performance) to ensure stability
 * **Bugfix**:
   * Saving Google Drive vaults would write "Untitled" files and never update original vault ([Buttercup Desktop issue](https://github.com/buttercup/buttercup-desktop/issues/1208))

## v7.2.0
_2023-05-11_

 * **Major changes**
   * Default format changed from **A** to **B**
 * Connect vault format optimisation to unlock process
 * Improve format merging during saving (deleted items)
 * **Bugfix**:
   * [#329](https://github.com/buttercup/buttercup-core/issues/329): Unable to empty trash

## v7.1.1
_2023-02-19_

 * **Bugfix**:
   * `VaultManager` missing vault source live snapshot handling

## v7.1.0
_2023-02-18_

 * Vault source live snapshots

## v7.0.0
_2023-02-13_

 * **Major Update**
   * ESM
   * Node v12 support dropped
   * Google Drive shared folders and files support
   * **Bugfix**:
     * [#321](https://github.com/buttercup/buttercup-core/issues/321): Format B merging ignores entry parent changes

## v6.17.0
_2023-01-09_

 * Dependency updates & audit

## v6.16.5
_2022-09-03_

 * Dropbox client upgrade: Global compat fix for CORS hack

## v6.16.4
_2022-09-03_

 * Dropbox client upgrade: Compatibility for CORS hack

## v6.16.2
_2022-08-31_

 * **Bugfix**:
   * Dropbox client updated: Bad `headers` option type

## v6.16.1
_2022-08-31_

 * Dropbox client update for custom headers

## v6.16.0
_2022-08-30_

 * New Dropbox client, for compatibility

## v6.15.3
_2022-08-29_

 * **Bugfix**:
   * Prevent setting Google Drive refresh token if empty (unavailable)

## v6.15.2
_2022-08-16_

 * **Bugfix**:
   * Saving new properties in format B vaults throws error

## v6.15.1
_2022-08-15_

 * **Bugfix**:
   * Transfer history in format A -> B conversion

## v6.15.0
_2022-08-03_

 * `VaultSource#convert` method for converting vault format

## v6.14.0
_2022-05-25_

 * Dropbox client upgrade for Node / Web compatibility

## v6.13.1
_2022-04-13_

 * Dropbox client improved web compatibility

## v6.13.0
_2022-04-12_

 * Dropbox client improved web compatibility

## v6.12.0
_2022-02-14_

 * `Credentials#setCredentialsData` and `Credentials#getCredentialsData` for setting and getting credentials data in closed environments
 * `Credentials#getData` deprecated

## v6.11.0
_2022-02-13_

 * Format A/B signature test methods

## v6.10.0
_2022-02-07_

 * `init` method app env map method for modifying individual properties

## v6.9.1
_2022-01-31_

 * **Bugfix**:
   * `VaultSource#save` correctly detecting saved content

## v6.9.0
_2022-01-31_

 * `VaultSource` `save` options parameter, with `storeOfflineCopy` (default `true`)

## v6.8.2
_2022-01-30_

 * `cowl` upgrade for `Layerr` info pass-through

## v6.8.1
_2022-01-30_

 * **Bugfix**:
   * Revert `is-in-browser` for `cowl`

## v6.8.0
_2022-01-30_

 * Improved `VaultSource#unlock` stability
   * Bugfix: `cowl` request dependency update to fix request failures when offline

## v6.7.0
_2022-01-17_

 * `TextDatasource.sourceID` for tracking parent `VaultSource`

## v6.6.0
_2021-11-09_

 * Explicit datasource config types
 * Datasource config exports

## v6.5.0
_2021-10-21_

 * `Entry#getPropertyValueType`
 * `Entry#setPropertyValueType`

## v6.4.0
_2021-10-18_

 * Search results include `groupID`

## v6.3.0
_2021-10-03_

 * `VaultSource#rename`

## v6.2.0
_2021-08-17_

 * `setEntryFacadePropertyValueType` For setting facade entry property value types
 * Exposed `getEntryPropertyValueType` and `setEntryPropertyValueType` helpers

## v6.1.0
_2021-08-14_

 * `createEntryFromFacade` for creating new entries from facades

## v6.0.0
_2021-06-06_

 * **Major release** (breaking changes)
   * My Buttercup support removed
   * New `iocane` version: New attachment encoding
   * Attachment support for WebDAV datasource

## v5.13.1
_2021-05-18_

 * **Bugfix**:
   * Merging Format-A vaults would break due to incorrectly modified PAD IDs
   * Decryption would break if the file contents contained a new-line

## v5.13.0
_2021-04-07_

 * `VaultSource#testMasterPassword`

## v5.12.2
_2021-03-21_

 * **Bugfix**:
   * `VaultManager` auto-update race condition

## v5.12.1
_2021-03-16_

 * `getEntryPath` and `getEntryFacadePath` helpers

## v5.12.0
_2021-03-16_

 * Search result `entryType` property

## v5.11.0
_2021-03-14_

 * `Search` deprecated
 * `VaultEntrySearch` replaces `Search` as vault entry searching utility
 * `VaultFacadeEntrySearch` added to support _facade_ searching for entries

## v5.10.0
_2021-03-13_

 * Dependencies update

## v5.9.1
_2021-01-26_

 * **Bugfix**:
   * `crypto-random-string` in devDependencies rather than dependencies

## v5.9.0
_2021-01-23_

 * Dependency upgrades
 * **Bugfix**:
   * Types not referenced correctly
   * URL-based search results ordered incorrectly

## v5.8.0
_2020-12-09_

 * Separated search portions for downstream use

## v5.7.0
_2020-12-06_

 * Reduced key derivation rounds for improved performance

## v5.6.2
_2020-12-06_

 * Upgrade `cowl`: Remove warning for invalid `responseType`

## v5.6.1
_2020-11-26_

 * `Search` preparation performance improvement

## v5.6.0
_2020-10-11_

 * `LocalStorageDatasource` for web

## v5.5.0
_2020-09-06_

 * Replaced `js-base64` with `base64-js` for `Buffer`-less base64 encoding and decoding
 * Added base64 encoding and decoding to app-env parameters

## v5.4.0
_2020-09-05_

 * UUID app-env method (for mobile compatibility)

## v5.3.1
_2020-09-04_

 * **Bugfix**:
   * Poor facade handling performance
   * Entries not able to be moved to another group (eg. to Trash)

## v5.3.0
_2020-09-04_

 * Persistent `Group` and `Entry` items (no spawn on request)
 * **Bugfix**:
   * ([#282](https://github.com/buttercup/buttercup-core/issues/282)) Memory leak while auto-updating

## v5.2.1
_2020-08-30_

 * **Bugfix**:
   * `Search` would fail to search due to bad `Fuse.js` import on web

## v5.2.0
_2020-08-30_

 * Upgrade `cowl` to remove `Buffer` dependencies

## v5.1.0
_2020-08-29_

 * Replace `VError` with [`Layerr`](https://github.com/perry-mitchell/layerr) for better portability

## v5.0.1
_2020-08-26_

 * Un-hide Credit Card dates

## v5.0.0
_2020-08-24_

 * **Major release** (breaking changes)
   * Codebase converted to **Typescript**
   * `VaultFormatB` introduced
   * Vault format routing (default: Format A)
   * New gzip compression utilities
   * Removed `getAttachmentDetails` method on datasources

## v4.13.1
_2020-08-19_

 * **Bugfix**:
   * ([#287](https://github.com/buttercup/buttercup-core/issues/287)) Vaults grow to enormous size

## v4.13.0
_2020-08-02_

 * Improved vault merging behaviour when using `VaultSource#save`

## v4.12.0
_2020-08-01_

 * Attachments for My Buttercup

## v4.11.1
_2020-07-28_

 * Prevent attachments crypto key override during import

## v4.11.0
_2020-07-28_

 * **Important attachments update**: Use new auto-generated attachments crypto key instead of master password. Avoid using earlier versions for attachments.

## v4.10.0
_2020-07-21_

 * Attachment `created` and `updated` timestamps

## v4.9.2
_2020-07-11_

 * **Bugfix**:
   * `reorderSource` on `VaultManager` wouldn't change source order

## v4.9.1
_2020-07-09_

 * **Bugfix**:
   * `pify` not installed (required for `FileDatasource`)

## v4.9.0
_2020-07-07_

 * No results from trash when using `Search`
 * `createVaultFacade` option for preventing groups and entries from trash being returned

## v4.8.2
_2020-07-07_

 * `Group.createNew` group ID parameter

## v4.8.1
_2020-07-06_

 * Emit `sourcesUpdated` event on `VaultManager` when `locked`/`unlocked` events fired

## v4.8.0
_2020-07-06_

 * _Open_ credentials support to allow for custom **external** datasources
 * **Node 10 deprecated**
 * Reduce `VaultManager` & `VaultSource` update events

## v4.7.1
_2020-07-05_

 * **Bugfix**:
   * `VaultSource` wouldn't emit updates for all changes
   * Fuse.js import in `Search` wouldn't work in web environment

## v4.7.0
_2020-07-02_

 * `Search` class for searching vaults
 * `EntryFinder` deprecated and disabled
 * `fieldsToProperties` for converting entry facade fields to a properties key-value object
 * Merge mode for consuming vault facades
 * **Bugfix**:
   * `VaultSource#changeMasterPassword` threw when getting datasource support for changing passwords

## v4.6.0
_2020-06-30_

 * `LocalFileDatasource` for web clients (from browser extension)

## v4.5.1
_2020-06-28_

 * **Bugfix**:
   * Broken `COLOUR_TEST` in VaultSource

## v4.5.0
_2020-06-24_

 * Environment override `env/v1/isClosedEnv` for handling primary passwords in credentials

## v4.4.1
_2020-06-22_

 * Improved safe-guards for `VaultManager#rehydrate` and `new TextDatasource()`

## v4.4.0
_2020-06-21_

 * `VaultManager` auto migrate legacy vaults
 * `TextDatasource` loads content from credentials if provided

## v4.3.0
_2020-06-21_

 * Attachments support for `FileDatasource`
 * Use live domain for My Buttercup

## v4.2.3
_2020-06-21_

 * **Bugfix**:
   * `GoogleDriveDatasource` failing upon initialisation in React Native

## v4.2.2
_2020-06-20_

 * **Bugfix**:
   * `GoogleDriveDatasource` couldn't be instantiated without an exception being thrown

## v4.2.1
_2020-06-12_

 * **Bugfix**:
   * Fix web build for compatibility

## v4.2.0
_2020-06-12_

 * Attachments
 * `MemoryDatasource` for in-memory vaults
 * `Entry#getType` helper
 * Additional vault insights

## v4.1.0
_2020-05-31_

 * Upgrade iocane -> 4.1.0 for better PBKDF2 override support
 * Audit and upgrade dependencies

## v4.0.0
_2020-05-30_

 * **Major release** (breaking changes)
   * Secure credentials handling
   * Stable **My Buttercup** client and datasource
   * Renamed the following structures:
     * `Archive` to `Vault`
     * `ArchiveManager` to `VaultManager`
     * `ArchiveSource` to `VaultSource`
   * Removed `Workspace`, moving functionality into `VaultSource`
   * Re-introduced the following libraries back into the core:
     * `@buttercup/datasources`
     * `@buttercup/facades`
     * `@buttercup/credentials`
     * `@buttercup/signing`
     * `@buttercup/app-env`
   * Require `init()` call to initialise the environment (app-env)
   * Moved **web** export to `buttercup/web`
   * Added _formats_ to support eventual vault format migrations
   * Alternate datasource `load()` output, à la `TextDatasource#load`, to output `Format` _and_ `history`
   * `VaultManager` support for dual storages for cache and vault config

## v3.0.0
_2020-03-15_

 * **Major release**
   * App-Env environment handling
   * Improved WebDAV client

## v3.0.0-rc3.2
_2020-01-26_

 * Upgrade WebDAV library - reduced bundle size

## v3.0.0-rc3.1
_2020-01-24_

 * Support for Regular Expressions in entry property searching

## v3.0.0-rc3.0
_2020-01-14_

 * Improved Entry property history structure
 * Many deprecated methods removed

## v3.0.0-rc2.1
_2020-01-05_

 * Reduced bundle / web size

## v3.0.0-rc2.0
_2020-01-03_

 * App-env usage
   * crypto simplification for web

## v3.0.0-rc1.1
_2019-12-20_

 * Change password support

## v3.0.0-rc1.0
_2019-11-03_

 * Pre-release v3
   * My Buttercup client/datasource
   * Shares (not yet connected)
   * Refactorings

## v2.16.1
_2019-10-10_

 * **Bugfix**:
   * Vault meta changes wouldn't write when storing an offline cache

## v2.16.0
_2019-10-06_

 * Datasources upgrade for Google Drive and Dropbox request functionality

## v2.15.4
_2019-08-02_

 * Google Drive client upgrade for `UInt8Array` incompatibilities

## v2.15.3
_2019-08-02_

 * **Bugfix**:
   * Google Drive Datasource not re-authorising on failure

## v2.15.2
_2019-07-23_

 * **Bugfix**:
   * Dropbox client PUT requests failing

## v2.15.1
_2019-07-22_

 * Dropbox / Google Drive request client upgrades (browser stability)

## v2.15.0
_2019-07-16_

 * Dropbox client upgrade: New request library (cowl)

## v2.14.0
_2019-07-11_

 * Entry property time prefix attribute

## v2.13.0
_2019-06-03_

 * TOTP URI attribute
 * Deprecations for entry facade methods

## v2.12.0
_2019-04-14_

 * Improved Google Drive authorisation handling

## v2.11.0
_2019-03-05_

 * Google Drive support
 * Support for updating source credentials (eg. expired API token renewal)

## v2.10.0
_2019-01-14_

 * Entry history

## v2.9.2
_2018-12-08_

 * Execute datasource instantiation callbacks for _each_ datasource type

## v2.9.1
_2018-12-05_

 * Datasource instantiation register for post processing datasource instances

## ~~v2.9.0~~
_2018-12-03_

 * Expose Dropbox request patcher

## v2.8.1
_2018-11-16_

 * New Dropbox client
 * New WebDAV client
 * Add `Entry#getProperties` method

## v2.7.0
_2018-10-27_

 * Ability to disable caching of vaults from within `ArchiveSource`

## v2.6.5
_2018-10-07_

 * **Bugfix**:
   * `Workspace#localDiffersFromRemote` and `Workspace#mergeFromRemote` used invalid instance-of check for detecting `TextDatasource`s

## v2.6.4
_2018-10-06_

 * Update datasources dependencies (security)
 * **Bugfix**:
   * `webdav` wouldn't connect with Seafile instances

## v2.6.3
_2018-10-03_

 * Add missing event for auto-update
 * **Bugfix**:
   * Auto update wouldn't run on _clean_ archives
   * `Workspace#localDiffersFromRemote` and `Workspace#mergeFromRemote` used cached copy of archive, preventing loading again

## v2.6.0
_2018-10-02_

**Deprecated**

 * Auto-update interrupt on `ArchiveManager`

## v2.5.0
_2018-10-02_

 * Auto-update functionality for `ArchiveManager`
 * Update dependencies to latest stable

## v2.4.1
_2018-08-27_

 * **Bugfix**:
   * Handle `ArchiveSource#unlock` calls when no `storageInterface` is set

## v2.4.0
_2018-08-11_

 * Add offline support to `ArchiveManager` and `ArchiveSource`
 * Add readOnly mode operation for `ArchiveSource` loading when content is overridden

## v2.3.0
_2018-07-28_

 * Add ID parameter to `Group.createNew()` (for importing purposes)

## v2.2.0
_2018-07-10_

 * Bugfix: Entry property names could not be made up of special characters
 * `Entry#getURLs`

## v2.1.0
_2018-06-26_

 * Add `removeable: false` property to Entry facades
 * Add `note` facade type

## v2.0.4
_2018-07-03_

 * Support `ArchiveSource` creation with type

## v2.0.3
_2018-06-25_

 * Bugfix: Remove meta references from Entry facades

## v2.0.2
_2018-06-22_

 * Bugfix: `Archive#getID()` call

## v2.0.1
_2018-06-22_

 * Bugfix: `Workspace#mergeFromRemote` bad load for `ArchiveComparator`

## v2.0.0
_2018-06-21_

 * Stable 2.0 release!

## v2.0.0-1 - v2.0.0-3
_2018-06-19_

 * Upgrade credentials to 1.1.1
   * Fix typo in `Credentials.fromSecureString`
 * Upgrade datasources to 1.1.1
   * Fix webdav file fetching (force text)
 * Fix `Workspace#localDiffersFromRemote`

## **v2.0.0-0**
_2018-06-16_

 * **New major** pre-release
   * Refactored codebase
   * Datasources, Credentials and signing split to separate repos
   * iocane upgrade and new API
   * Deprecation of meta
     * Meta is now mapped to properties within the archive instance (meta commands do not create meta properties internally)
   * Removed debug statements
   * Fixed several minor bugs
   * Improved flattening algorithm to prevent excessive operations

## v1.7.1
_2018-05-27_

 * Update `iocane` to `0.10.2` (future proofing)

## v1.7.0
_2018-05-27_

 * Update `webdav-fs` to `1.10.1`

## v1.6.2
_2018-03-15_

 * Update `webdav-fs` to `1.9.0`
 * Bugfix: Changing password in new `ArchiveManager` would fail in deadlock

## v1.5.1
_2018-02-15_

 * Add queues to `ArchiveManager` and `ArchiveSource` classes

## v1.5.0
_2018-02-14_

 * Add new `ArchiveManager` and `ArchiveSource` classes

## v1.4.0
_2017-01-11_

 * `ArchiveManager#updateArchiveCredentials` to call `Workspace.save` after updating the credentials

## v1.3.1
_2017-01-10_

 * Fix master password update process (`ArchiveManager` integration)

## v1.3.0
_2017-01-10_

 * Support for changing archive names in `ArchiveManager` ([#193](https://github.com/buttercup/buttercup-core/issues/193))

## v1.2.0
_2017-01-10_

 * Support for changing the master password ([#197](https://github.com/buttercup/buttercup-core/issues/197))

## v1.1.2
_2017-12-08_

 * **Bugfix**:
   * Fixed `ArchiveManager#removeSource` functionality in web context (`LocalStorageInterface` had no remove method)

## v1.1.1
_2017-11-18_

**Security release**

 * Upgrade iocane to 0.10.1
   * Fixes [DOS vulnerability in `debug` module](https://github.com/perry-mitchell/iocane/pull/21)

## v1.1.0
_2017-11-08_

 * Added `EntryFinder` for fuzzy searching entries

## **v1.0.0**
_2017-11-05_

 * Major release! Hooray!
 * `getAttributes` added to `Archive`, `Group` and `Entry` classes

## v1.0.0-rc1 - rc4
_2017-10-21_

 * Inclusion of core-web

## v0.50.0
_2017-10-16_

 * Allow overriding of already-registered datasources

## v0.49.0
_2017-09-04_

 * Add override methods for salt and IV generation in iocane

## v0.48.0
_2017-09-02_

 * Add [overridable crypto methods](https://github.com/buttercup/buttercup-core/blob/b285c1449ae4a0430729388559524ba13d85c6ca/source/tools/overridable.js#L26)

## v0.47.1
_2017-08-29_

 * Upgrade iocane to 0.9.0
   * Core crypto now async

## v0.46.0
_2017-08-26_

 * Upgrade iocane to 0.8.0
   * Expose ability to override built-in encryption/decryption methods

## v0.45.0
_2017-07-24_

 * **Bugfix**: Entry facades remove meta/attributes that no longer exist
 * Entry `getProperty`/`getMeta`/`getAttribute` return base objects when no parameters specified

## v0.44.1
_2017-07-16_

 * Expose `webdav-fs` via vendor props: `Buttercup.vendor.webdavFS` (for `fetch` override support)

## v0.43.0
_2017-07-07_

 * Entry facades: Dynamic field editing

## v0.42.1
_2017-07-07_

 * **Bugfix**: `ArchiveManager` `unlockedSources` returns array of booleans

## v0.42.0
_2017-07-06_

 * Change event emitters (`ArchiveManager`, `Archive` & `Westley`) to be asynchronous: [#169](https://github.com/buttercup/buttercup-core/issues/169)

## v0.41.2
_2017-07-03_

 * **Bugfix**: Wrong password when unlocking source in `ArchiveManager` breaks state

## v0.41.1
_2017-06-30_

 * **Bugfix**: Wrong credentials passed to `Workspace` in `ArchiveManager`: [#167](https://github.com/buttercup/buttercup-core/issues/167)

## v0.41.0
_2017-06-24_

 * Upgrade webdav-fs to 1.3.0
   * Disable browser `window.fetch` for stability
 * Add `remove` method to `ArchiveManager`

## v0.40.1
_2017-06-10_

 * Add missing event for source rehydration in `ArchiveManager`

## v0.40.0
_2017-05-28_

 * Add event emitters to `Westley` and `Archive` instances for when archive changes occur
 * Add event emitter to `ArchiveManager` for state updates
 * Upgrade **webdav-fs** to `1.0.0`
 * **Bugfix**: Empty values for properties/meta/attributes

## v0.39.1
_2017-05-22_

 * Add support for credentials to be stringified and parsed _insecurely_ (`TextDatasource` deferred encoding hander support for separated interfaces like React Native and WebViews).
 * Expose `TextDatasource` default encoding handlers

## v0.39.0
_2017-05-21_

 * Add support for deferring encryption and packaging in `TextDatasource`

## v0.38.1
_2017-05-02_

 * Expose `StorageInterface`

## v0.38.0
_2017-04-29_

 * Add [MyButtercup](https://github.com/buttercup/roadmap/blob/9da2fad70941f5eda056c2de6d6c112f49470878/roadmap/OVERALL.md#mybuttercup) integration
 * Add [Nextcloud](https://nextcloud.com/) integration

## v0.37.1
_2017-04-16_

 * Bugfix: Fix merge stripping deletion commands when no changes occurred on the remote side

## v0.37.0
_2017-03-27_

 * Add `Group.getGroup()` support for getting parent groups

## v0.36.0
_2017-03-20_

 * Add searching tool for fetching all entries from an archive
 * Expose searching tools

## v0.35.0
_2017-03-11_

 * Serialisation of all string-type values in history
   * _Old versions of Buttercup **will not be able to read** archives from this version!_

## v0.34.0
_2017-03-06_

 * Upgrade iocane to 0.6.0
    * Increase PBKDF2 rounds to 200-250k
 * New credentials factory
 * **Breaking:**
    * Remove old `Workspace`
    * Rename `SharedWorkspace` to `Workspace`
    * Remove `Credentials` class
    * All password authentication methods to use new credentials structure

## v0.33.2
_2017-01-07_

 * Type checking getter `type` on `Archive` and `Group` instances
 * Better type checking in group moving

## v0.33.0
_2017-01-07_

 * Add `getHistory` method for `Archive` instances
 * Add `createFromHistory` factory method to `Archive`

## v0.32.0
_2017-01-06_

 * Add `emptyTrash` method to `Archive`

## v0.31.0
_2017-01-04_

 * Add `findEntryByID` to `Archive` and `Group` classes
 * Throw errors when creating entries/groups within trash

## v0.30.2
_2016-12-30_

 * Fix OwnCloudDatasource's [`fromObject` bug](https://github.com/buttercup-pw/buttercup-core/issues/129)

## v0.30.0
_2016-12-27_

 * Ensure archive ID always generated
 * Added Entry `isInTrash` method
 * Datasource registration (support for 3rd party datasources)
 * `TextDatasource` stores content when using `toObject` or `toString`
 * **Breaking:**
    * Datasource `toString` format rewrite
    * Datasource `toObject`
    * Datasource tools removed (`Buttercup.tools.datasource`)

## v0.29.0
_2016-11-30_

 * Credentials meta support
 * Debug support

## v0.28.0
_2016-11-07_

 * Read-only archives
 * Shared groups
 * Added `SharedWorkspace` for managing several archives
 * Support for moving groups between archives

## v0.27.0
_2016-10-30_

 * Group & Entry searching decorators for Archives and Groups
 * Renamed ManagedGroup to Group
 * Renamed ManagedEntry to Entry
 * Deprecated `Archive.getGroupByID` and `Group.getGroupByID` in favour of `findGroupByID`

## v0.26.0
_2016-10-23_

 * Attributes for archives

## v0.25.0
_2016-10-16_

 * Entry deletion improved (trash and then deleted)
 * Group deletion improved (trash and then deleted)
 * Fixed group `toObject` not passing options to recursive calls
 * Group `toString` takes `toObject` output options

## v0.24.0
_2016-10-15_

 * Group `toObject` upgrade (deep output)

## v0.23.0
_2016-10-02_

 * Buttercup server integration -> datasource

## v0.22.0
_2016-09-27_

 * Key file support

## v0.21.0
_2016-08-07_

 * JSON exporting
 * Datasource to/from strings

## v0.20.1
_2016-07-17_

 * Added datasources
 * Workspace saving -> async

## v0.19.0
_2016-04-09_

 * Support for overriding iocane's PBKDF22 method externally (core-web)

## v0.18.0
_2016-04-03_

 * Integrated iocane
 * ES6 support
    * Dropped Node 0.12

## v0.17.0
_2016-02-27_

 * Set PBKDF2 iteration count to 6-8k
 * Archive searching for entries & groups

## v0.16.0
_2016-02-21_

 * Archive searching
 * WebDAV-fs upgrade -> 0.4.0

## v0.15.1
_2016-02-20_

 * Fixed removed link script (npmignore)

## v0.15.0
_2016-02-19_

 * Increased PBKDF2 iterations

## v0.14.0
_2016-02-12_

 * Added `Credentials`
