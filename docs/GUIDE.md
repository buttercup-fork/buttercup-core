# Using Buttercup Core

A task-oriented guide to using `buttercup` as a library: opening a vault, and listing, reading, creating, updating and deleting entries. For the full reference of every class and function, see the [API documentation](api/README.md).

- [Concepts](#concepts)
- [Setup](#setup)
- [Creating a vault](#creating-a-vault)
- [Opening an existing vault](#opening-an-existing-vault)
- [Working with groups and entries](#working-with-groups-and-entries)
    - [Listing entries](#listing-entries)
    - [Reading an entry](#reading-an-entry)
    - [Finding entries](#finding-entries)
    - [Creating an entry](#creating-an-entry)
    - [Updating an entry](#updating-an-entry)
    - [Hiding a custom field](#hiding-a-custom-field)
    - [Storing recovery codes](#storing-recovery-codes)
    - [Single-use passwords](#single-use-passwords)
    - [Password expiry](#password-expiry)
    - [Ordering fields](#ordering-fields)
    - [Linking a field to another entry](#linking-a-field-to-another-entry)
    - [Signing in with another entry](#signing-in-with-another-entry)
    - [Deleting an entry](#deleting-an-entry)
- [Saving and locking](#saving-and-locking)
- [Merging conflict copies](#merging-conflict-copies)
- [Other storage backends](#other-storage-backends)
- [Low-level access without a VaultSource](#low-level-access-without-a-vaultsource)

## Concepts

| Class | What it is |
| --- | --- |
| [`Vault`](api/classes/Vault.md) | The decrypted, in-memory vault. Holds groups; knows nothing about storage or encryption. |
| [`Group`](api/classes/Group.md) | A folder of entries (and sub-groups). New vaults usually have a `General` and a `Trash` group. |
| [`Entry`](api/classes/Entry.md) | A single secret - a login, note, credit card etc. Its data is a set of string **properties** (`title`, `username`, `password`, `URL`, or anything custom) plus internal **attributes**. |
| [`Credentials`](api/classes/Credentials.md) | Holds a password and (optionally) datasource configuration - where the vault lives. |
| [`VaultSource`](api/classes/VaultSource.md) | One vault plus where it is stored. Handles unlocking (load + decrypt), saving (encrypt + write) and locking. |
| [`VaultManager`](api/classes/VaultManager.md) | Manages a collection of `VaultSource`s. A source must be added to a manager before it is unlocked. |

Changes made to a `Vault`, `Group` or `Entry` only modify the in-memory vault. Nothing is written until you call `save()` on its `VaultSource`.

## Setup

Buttercup Core is ESM-only, and requires `init()` to be called once before anything else (calling it again has no effect):

```javascript
import { init } from "buttercup";

init();
```

In the browser, import from `buttercup/web` instead of `buttercup`.

## Creating a vault

A vault source is described by **datasource credentials**: the datasource `type`, its configuration (here, a file `path`), and the vault's master password. The `type` is required when going through a `VaultSource`.

```javascript
import { Credentials, VaultManager, VaultSource, init } from "buttercup";

init();

const MASTER_PASSWORD = "correct horse battery staple";

const manager = new VaultManager();
const datasourceCredentials = Credentials.fromDatasource(
    { type: "file", path: "./my.bcup" },
    MASTER_PASSWORD
);
const source = new VaultSource(
    "My vault", // Display name
    "file", // Datasource type
    await datasourceCredentials.toSecureString()
);
await manager.addSource(source);

// `initialiseRemote` creates a new, empty vault (with General + Trash
// groups) instead of loading one - only use it when creating a vault
await source.unlock(Credentials.fromPassword(MASTER_PASSWORD), {
    initialiseRemote: true
});
await source.save();
```

To create the two groups with titles in the user's language, pass `defaultGroupTitles`. Buttercup finds the Trash group by a role attribute rather than its title, so any title works:

```javascript
await source.unlock(Credentials.fromPassword(MASTER_PASSWORD), {
    initialiseRemote: true,
    defaultGroupTitles: { general: "Allgemein", trash: "Papierkorb" }
});
```

`Vault.createWithDefaults({ groupTitles: { general, trash } })` does the same for a `Vault` created without a `VaultSource`. Titles left out, or empty, stay `General` and `Trash`. Existing vaults are not changed.

## Opening an existing vault

The same as creating, without `initialiseRemote`:

```javascript
const manager = new VaultManager();
const datasourceCredentials = Credentials.fromDatasource(
    { type: "file", path: "./my.bcup" },
    MASTER_PASSWORD
);
const source = new VaultSource("My vault", "file", await datasourceCredentials.toSecureString());
await manager.addSource(source);
await source.unlock(Credentials.fromPassword(MASTER_PASSWORD));

const vault = source.vault; // The unlocked Vault instance
```

`unlock()` rejects if the password is wrong or the file can't be read. Once unlocked, `source.status` is `VaultSourceStatus.Unlocked` (`"unlocked"`).

If you're writing a short-lived script, pass `{ autoUpdate: false }` to the `VaultManager` constructor. Otherwise the manager periodically checks the source for remote changes, which keeps the process alive.

## Working with groups and entries

### Listing entries

```javascript
// Top-level groups
const groups = vault.getGroups(); // [Group "General", Group "Trash"]

// Every entry in the vault, in every group (including Trash)
for (const entry of vault.getAllEntries()) {
    if (entry.isInTrash()) continue;
    const { title, username, password } = entry.getProperty();
    console.log(entry.id, title, username, password);
}

// Entries directly inside one group
const general = vault.findGroupsByTitle("General")[0];
const generalEntries = general.getEntries();

// Entries inside a group and all of its sub-groups, at any depth
const allGeneralEntries = general.getAllEntries();
const allSubGroups = general.getAllGroups();
```

### Reading an entry

```javascript
entry.getProperty("password"); // A single property - string, or undefined
entry.getProperty(); // All properties as an object: { title, username, password, ... }
entry.getType(); // EntryType: "login", "note", "credit_card", ...
entry.getTags(); // ["work", ...]
entry.getGroup(); // The parent Group
```

### Finding entries

```javascript
// By ID
const entry = vault.findEntryByID(entryID);

// By exact property value, or regular expressions for either argument
vault.findEntriesByProperty("username", "jane");
vault.findEntriesByProperty("title", /bank/i);

// By tag
vault.findEntriesByTag("work");

// By type (entries without a type set are logins)
import { EntryType } from "buttercup";
vault.findEntriesByType(EntryType.CreditCard);

// The tags and entry types in use, eg. for offering filters
vault.getAllTags(); // ["finance", "work"]
vault.getAllEntryTypes(); // ["credit_card", "login"]
```

For fuzzy, user-facing search (the kind the Buttercup apps use), use [`VaultEntrySearch`](api/classes/VaultEntrySearch.md). It returns plain [`SearchResult`](api/interfaces/SearchResult.md) objects rather than `Entry` instances. Use `vault.findEntryByID(result.id)` to get the entry back.

```javascript
import { VaultEntrySearch } from "buttercup";

const search = new VaultEntrySearch([vault]);
await search.prepare();

search.searchByTerm("bank"); // Fuzzy match on title/username/URL
search.searchByURL("https://bank.example.com/login"); // Entries for a website
```

Search terms can include filters. `#tag` keeps entries that have the tag, and `type:<entry type>` keeps entries of that type, eg. `type:login`, `type:credit_card` or `type:ssh_key`. Several tags must all match, while several types match any of them. A term with only filters returns every matching entry:

```javascript
search.searchByTerm("type:credit_card"); // All credit cards
search.searchByTerm("type:credit_card #work"); // Credit cards tagged "work"
search.searchByTerm("type:login bank"); // Logins matching "bank"
```

Search results never include entries in Trash. Call `prepare()` again after the vault changes.

### Creating an entry

Entries are created inside a group. Property setters return the entry, so they can be chained:

```javascript
import { Entry, EntryType } from "buttercup";

const entry = general
    .createEntry("My bank") // Sets the "title" property
    .setProperty("username", "jane")
    .setProperty("password", "s3cureP4$$")
    .setProperty("URL", "https://bank.example.com");

// Optional: entries are logins unless set otherwise
entry.setAttribute(Entry.Attributes.FacadeType, EntryType.Note);

await source.save();
```

Groups work the same way: `vault.createGroup("Websites")`, or `group.createGroup("Sub-group")` for nesting.

### Updating an entry

```javascript
entry.setProperty("password", "n3wP4ss");
entry.deleteProperty("URL");
entry.addTags("finance");
entry.moveToGroup(otherGroup);

await source.save();
```

Buttercup keeps a history of changed property values, which the apps show as "entry history". See `entry.getChanges()`.

### Hiding a custom field

To have the apps hide a custom field's value the way they hide passwords (eg. a security answer or a PIN), give it the `password` value type:

```javascript
import { EntryPropertyValueType } from "buttercup";

entry.setProperty("Security answer", "Rex");
entry.setPropertyValueType("Security answer", EntryPropertyValueType.Password);

entry.getPropertyValueType("Security answer"); // "password"
```

The value type is stored in a `BC_ENTRY_FIELD_TYPE:<property>` attribute and shows up as the field's `valueType` in entry facades. Other value types are `note` (multi-line), `otp` (a one-time password URI) and `text`, the default. `setPropertyValueType(property, null)` resets it to `text`.

### Storing recovery codes

A field can hold a list of recovery codes (eg. a service's 2FA backup codes), each of which can be marked as used:

```javascript
entry.setRecoveryCodes("Recovery codes", ["a1b2-c3d4", "e5f6-g7h8", "i9j0-k1l2"]);
entry.markRecoveryCodeUsed("Recovery codes", "e5f6-g7h8");

entry.getRecoveryCodes("Recovery codes");
// [
//   { code: "a1b2-c3d4", used: false },
//   { code: "e5f6-g7h8", used: true },
//   { code: "i9j0-k1l2", used: false }
// ]

// Or turn an existing field into recovery codes, one code per line:
entry.setProperty("Backup codes", "one two three\nfour five six");
entry.setRecoveryCodes("Backup codes");
```

The codes are stored one per line as the field's value, and the field becomes a password field, so apps without recovery codes support still hide it. Which codes are used is kept in a `BC_ENTRY_RECOVERY_CODES:<property>` attribute. Pass `false` as a third argument to `markRecoveryCodeUsed` to mark a code as unused again. `isRecoveryCodesProperty(property)` tells recovery codes apart from other password fields, and `unsetRecoveryCodes(property)` turns the field back into a plain password field.

### Single-use passwords

Some services hand out a list of passwords (eg. transaction numbers) that are each used once, in order:

```javascript
entry.setSingleUsePasswords(["K7-2Q9", "M3-8XP", "R5-1LW"]);
entry.getProperty("password"); // "K7-2Q9"

// Once the current password was used:
entry.popSingleUsePassword(); // "M3-8XP", now in the password field
entry.getSingleUsePasswords(); // ["M3-8XP", "R5-1LW"]
```

The current password is kept in the `password` field, so it works like any other password, and the rest are queued one per line in a `Single-use passwords` field (`Entry.SingleUsePasswordsProperty`), which is a password field so apps hide it. A `BC_ENTRY_SINGLE_USE_PASSWORDS` attribute marks the entry (`hasSingleUsePasswords()`). Once the last password is used, `popSingleUsePassword()` returns `null` and leaves the password field empty, ready for a new list. Used passwords stay in the entry's history. `unsetSingleUsePasswords()` keeps the current password and drops the queue.

### Password expiry

An entry's password can be set to expire a number of days after it was last changed:

```javascript
entry.setPasswordExpiry(90);
entry.hasExpiredPassword(); // false, until 90 days after the last change
entry.getPasswordExpiryTime(); // when it expires (UTC timestamp in milliseconds)

// Changing the password starts the 90 days again:
entry.setProperty("password", "n3wP4ss");

// Entries with expired passwords, outside of Trash:
vault.findEntriesByExpiredPassword();
// Or those that will have expired in two weeks:
vault.findEntriesByExpiredPassword(Date.now() + 14 * 24 * 60 * 60 * 1000);
```

Whenever the password is set to a new value, its change time is stored in a `BC_ENTRY_PASSWORD_CHANGED` attribute (`getPasswordChangedTime()`), including changes made through entry facades. Passwords last changed before this was recorded have no change time, so `setPasswordExpiry` starts their period from now. The period is stored in a `BC_ENTRY_PASSWORD_EXPIRY` attribute, and `setPasswordExpiry(null)` removes it. A password linked to another entry's password (see [Linking a field to another entry](#linking-a-field-to-another-entry)) uses that one's change time. Vault insights count expired passwords as `expiredPasswords`.

### Ordering fields

An entry's fields can be put in a custom display order:

```javascript
entry.getPropertyOrders(); // ["title", "username", "password", "PIN"]

// Move one field, shifting the others along:
entry.setPropertyOrder("PIN", 1);
entry.getPropertyOrders(); // ["title", "PIN", "username", "password"]

// Or set the whole order at once, eg. after drag and drop.
// Fields that aren't listed follow, in their current order:
entry.setPropertyOrders(["password", "username"]);
entry.getPropertyOrders(); // ["password", "username", "title", "PIN"]
```

Each field's position is stored in a `BC_ENTRY_FIELD_ORDER:<property>` attribute, starting from 0. `getPropertyOrder(property)` returns a field's position, or `Infinity` if it has none. Fields without a position, such as ones added later, come after the ordered ones. `resetPropertyOrders()` removes the order, and deleting a field removes its position.

Entry facades follow the order: once an entry has one, `createEntryFacade` lists its property fields in that order. When fields are moved in a facade, `consumeEntryFacade` saves the new order. A facade whose fields weren't moved leaves the order alone.

### Linking a field to another entry

A field can show the value of a field on another entry in the same vault, so that one change updates every entry using it. For example, several sites you sign in to with one Google account:

```javascript
youtube.linkProperty("password", google); // Same property name
youtube.linkProperty("Google login", google, "username"); // Another property

google.setProperty("password", "n3wG00gle");
youtube.getProperty("password"); // "n3wG00gle"
youtube.getPropertyLink("password"); // { entryID: google.id, property: "password" }
```

Linked values are read everywhere a value is: `getProperty()`, `getProperties()`, `getURLs()`, entry facades and search.

- **Editing** a linked field, with `setProperty()` or through a facade, replaces the link with its own value. The other entry is never changed.
- **Unlinking**: `youtube.unlinkProperty("password")` keeps the current value, and `{ keepValue: false }` removes the field.
- **Broken links**: if the other entry is moved to Trash or deleted, or its field is removed, the link is broken (`isPropertyLinkBroken()`). The field then shows the value it had when it was last in sync, and works again if the entry is restored from Trash.
- **Stored copy**: each linked field also stores a copy of its value, which saving keeps up to date. Apps without link support show that copy.

`linkProperty()` throws if the other entry is in another vault or in Trash, doesn't have the field, or the link would loop back to itself.

### Signing in with another entry

Some accounts have no password of their own because you sign in to them with another account, eg. "Sign in with Google". Such an entry can point to the entry it signs in with:

```javascript
dndBeyond.setLoginEntry(google);
dndBeyond.getLoginEntry(); // the Google entry

// Entries that sign in with Google, outside of Trash:
vault.findEntriesUsingLogin(google); // [dndBeyond]

// If the Google entry is trashed or deleted, the link is broken but still
// remembers its title:
dndBeyond.isLoginEntryBroken(); // true
dndBeyond.getLoginEntryLink(); // { entryID: "…", title: "Google" }
```

The link is stored in a `BC_ENTRY_LOGIN_ENTRY` attribute as `<entry ID>:<title>`, and the title is refreshed when the vault is saved. `setLoginEntry(null)` removes the link. Links to the entry itself, to another vault, to Trash, or that would loop (Google signing in with D&D Beyond) are refused.

`vault.findEntriesLinkingTo(entry)` finds every entry that depends on an entry: those that sign in with it, and those with fields linked to its fields (see [Linking a field to another entry](#linking-a-field-to-another-entry)). Apps can use it to warn before an entry is deleted.

### Deleting an entry

```javascript
entry.delete(); // Moves the entry to the Trash group
entry.delete(true); // Deletes permanently, skipping Trash

vault.emptyTrash(); // Permanently deletes everything in Trash

await source.save();
```

`delete()` on an entry that is already in Trash deletes it permanently. `group.delete()` works the same way for groups and their contents.

## Saving and locking

```javascript
await source.save(); // Encrypt and write the vault
await source.lock(); // Discard the decrypted vault from memory
```

`lock()` does **not** save. Save first if you have made changes.

## Merging conflict copies

When two devices change a synced vault file at the same time, sync services keep both versions by saving one under a new name next to the original, eg. `vault (Jane's conflicted copy 2026-09-24).bcup`. `findConflictCopies()` picks these out of a directory listing (Dropbox, Nextcloud, ownCloud, Syncthing and Seafile naming is recognised). Merge each one into the unlocked vault, save, and only then remove the copy:

```javascript
import { readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { Credentials, findConflictCopies } from "buttercup";

const vaultPath = "/home/jane/Dropbox/vault.bcup";
const dir = dirname(vaultPath);
const copies = findConflictCopies(
    vaultPath,
    readdirSync(dir).map((file) => join(dir, file))
);
for (const copyPath of copies) {
    await source.mergeFromCredentials(
        Credentials.fromDatasource({ type: "file", path: copyPath }, "my master password")
    );
}
if (copies.length > 0) {
    await source.save();
    copies.forEach((copyPath) => rmSync(copyPath));
}
```

Changes from both copies are kept. Where the same field was changed in both, the later change wins in Format B vaults. `mergeFromCredentials()` refuses files that aren't copies of the same vault, giving an error with the code `ErrorCode.VaultMismatch` (read it with `getErrorCode(err)`). It gives `ErrorCode.VaultFormatMismatch` for a copy in the other vault format, and `ErrorCode.DecryptionFailed` for a wrong password. A copy saved after a password change on the other device needs that device's password.

Services that add only a number or device name (iCloud's `vault 2.bcup`, OneDrive's `vault-LAPTOP.bcup`) aren't detected, as those names can't be told apart from other files. Ask the user to pick the file instead. `mergeFromCredentials()` still checks it's the same vault.

## Other storage backends

Only the datasource credentials change - everything after `unlock()` is identical. The configuration shape for each type is documented in the API reference:

| `type` | Configuration |
| --- | --- |
| `"file"` | [`DatasourceConfigurationFile`](api/interfaces/DatasourceConfigurationFile.md) (NodeJS only) |
| `"webdav"` | [`DatasourceConfigurationWebDAV`](api/interfaces/DatasourceConfigurationWebDAV.md) |
| `"dropbox"` | [`DatasourceConfigurationDropbox`](api/interfaces/DatasourceConfigurationDropbox.md) |
| `"googledrive"` | [`DatasourceConfigurationGoogleDrive`](api/interfaces/DatasourceConfigurationGoogleDrive.md) |
| `"onedrive"` | [`DatasourceConfigurationOneDrive`](api/interfaces/DatasourceConfigurationOneDrive.md) - by `fileID` or by `path` (saving to a new path creates the file) |
| `"memory"` | [`DatasourceConfigurationMemory`](api/interfaces/DatasourceConfigurationMemory.md) (testing) |

Dropbox, Google Drive and OneDrive need OAuth tokens that your application obtains itself. Buttercup Core doesn't perform the OAuth flow. For Google Drive and OneDrive, register a handler to refresh expired tokens. It runs when a request fails authentication, and the request is then retried once:

```javascript
import { DatasourceAuthManager } from "buttercup";

DatasourceAuthManager.getSharedManager().registerHandler("onedrive", async (datasource) => {
    const { accessToken, refreshToken } = await myRefreshFunction(datasource.refreshToken);
    datasource.updateTokens(accessToken, refreshToken);
});
```

## Low-level access without a VaultSource

Datasources can be used directly to load or save a vault's history, with no `VaultManager`/`VaultSource`. This is lower-level: there's no locking, no merging of remote changes, and you must pass the vault's `Format` around yourself.

```javascript
import { Credentials, FileDatasource, Vault, init } from "buttercup";

init();

const datasource = new FileDatasource(
    Credentials.fromDatasource({ path: "./my.bcup" }, MASTER_PASSWORD)
);
const { Format, history } = await datasource.load(Credentials.fromPassword(MASTER_PASSWORD));
const vault = Vault.createFromHistory(history, Format);

// ...modify the vault...

await datasource.save(vault.format.history, Credentials.fromPassword(MASTER_PASSWORD));
```

A datasource instance caches the vault contents from its first `load()`, and `save()` doesn't refresh that cache. Calling `load()` again on the same instance returns the originally loaded vault, not what was saved since. Create a new datasource instance to re-read from storage.

Prefer a `VaultSource` unless you have a reason not to - it handles this for you.
