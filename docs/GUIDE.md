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
```

For fuzzy, user-facing search (the kind the Buttercup apps use), use [`VaultEntrySearch`](api/classes/VaultEntrySearch.md). It returns plain [`SearchResult`](api/interfaces/SearchResult.md) objects rather than `Entry` instances. Use `vault.findEntryByID(result.id)` to get the entry back.

```javascript
import { VaultEntrySearch } from "buttercup";

const search = new VaultEntrySearch([vault]);
await search.prepare();

search.searchByTerm("bank"); // Fuzzy match on title/username/URL
search.searchByURL("https://bank.example.com/login"); // Entries for a website
```

Call `prepare()` again after the vault changes.

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
