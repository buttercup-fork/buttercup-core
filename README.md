<h1 align="center">
  <br/>
  <img src="images/core.svg" alt="Buttercup Core">
  <br/>
  <br/>
  <br/>
</h1>

# Buttercup core library

A NodeJS secrets vault.

> This is [codekunde](https://github.com/codekunde)'s self-hosted fork of the archived [buttercup/buttercup-core](https://github.com/buttercup/buttercup-core), maintained after upstream's project closure (see below). Issues and PRs on the upstream repo are still ignored; this fork tracks and fixes them independently - see `CHANGELOG.md` for what's changed here.

[![Buttercup](images/buttercup-slim.svg)](https://buttercup.pw) [![npm](https://img.shields.io/npm/dt/buttercup.svg)](https://www.npmjs.com/package/buttercup) [![npm version](https://badge.fury.io/js/buttercup.svg)](https://badge.fury.io/js/buttercup) ![node min version](https://img.shields.io/badge/node-%3E%3D%2014.x-lightgrey.svg) [![security](https://img.shields.io/badge/Security-As%20you%20wish-green.svg)](https://en.wikipedia.org/wiki/The_Princess_Bride_(film)) [![encryption](https://img.shields.io/badge/Encryption-AES%20256%20CBC%2FGCM-red.svg)](https://tools.ietf.org/html/rfc3602)

[![NPM](https://nodei.co/npm/buttercup.png)](https://www.npmjs.com/package/buttercup)

_The npm/version badges above track the upstream `buttercup` package this fork is based on (this fork isn't published to npm separately). The upstream GitHub Actions test-status badge was removed since it reflected upstream's own CI runs, not this fork's - see `CHANGELOG.md` for this fork's test status/history._

## About

⚠️ Upstream's Buttercup project [came to an end](https://gist.github.com/perry-mitchell/43ebfcec4d874b77a704be1d4f2262e6) and its repositories became public archives (discussion [here](https://github.com/buttercup/buttercup-desktop/discussions/1395)). This fork exists to keep the library maintained; upstream itself no longer accepts issues or PRs.

Buttercup is a JavaScript password manager for NodeJS and the browser (though you can also see it used on platforms like [React Native](https://github.com/buttercup/buttercup-mobile)). It's based around the concept of a **Vault** and its secret **Entry** items (a login, credit card etc.). Entries are then separated into **Group** containers that make organising vaults a little easier.

Because Buttercup is designed first and foremost to be consumed by users in some application, **VaultManager** and **VaultSource** constructs are provided to allow for easy control over several vaults in a somewhat shared environment. A vault manager provides easy-to-use methods to perform dehydration and rehydration (storage in serialised form) of vaults to some secure storage (files, remote datasources etc.).

Buttercup can save and load vaults that are stored locally, in cloud service providers like Dropbox or Google Drive, or in a cloud service's WebDAV-enabled storage. It does this by providing a **Datasource** construct for each provider.

Because Buttercup can be consumed in some interesting and varied environments, serialisation tools called **facades** are provided to allow for greater flexibility when working with vault data structures. Facades provide a way to move data around without _classes_, converting vaults to and from JSON objects. Facades are used when attaching vaults to user interfaces like with the [Buttercup UI library](https://github.com/buttercup/ui).

### Features

The core of the system, this **Buttercup Core**, boasts a few awesome features:

 * Merge-able vault contents
 * History for back-tracking to previous passwords etc.
 * File attachments (encrypted)
 * AES-GCM encryption (older AES-CBC vaults remain readable)
 * GZip compression
 * NodeJS and Browser support

This library also supports a variety of datasources for loading from and saving to:

 * WebDAV
 * [Dropbox](https://www.dropbox.com/)
 * [Google Drive](https://www.google.com/drive/)
 * [OneDrive](https://www.microsoft.com/microsoft-365/onedrive/) (via Microsoft Graph)
 * Local files
 * In-memory (testing, prototyping)

Check out the [changelog](https://github.com/buttercup/buttercup-core/blob/master/CHANGELOG.md).

## Installation

> ⚠️ **The `buttercup` package on npm is upstream's, not this fork's.** `npm install buttercup` installs upstream's last-published code and does **not** include this fork's fixes (security hardening, `#278`/`#326`/`#305` bugfixes - see `CHANGELOG.md`). This fork isn't published to npm. Until GitHub access is restored, install from source (clone this repo / the forgejo mirror) if you need this fork's fixes. Getting this fork properly installable (its own package name, or a git-based install) is high priority once GitHub is back.

To use Buttercup in a NodeJS environment, you can simply install and require it:

```shell
npm install buttercup --save
```

In a Node environment, for example:

```javascript
const { Vault } = require("buttercup");
```

Or for Typescript:

```typescript
import { Vault } from "buttercup";
```

In a _web_ environment, use the following:

```javascript
import { Vault } from "buttercup/web";
```

Buttercup core is ESM - you must either import it in a project that is also ESM, or use a build tool like Webpack.

_Buttercup core supports Node version 14 and up. For older Node versions use v6 and earlier._

## Usage

> 📖 **[Usage guide](docs/GUIDE.md)** - opening a vault and listing, reading, creating, updating and deleting entries. **[API reference](docs/api/README.md)** - every exported class and function (generated from the source with `npm run docs`).

Buttercup uses `Vault`s, `Group`s and `Entry`s to manipulate data in a _workspace_-like environment. These 3 constructs have no knowledge of encryption or storage, and simply provide interfaces for working with the data structures.

To manage vaults, their storage and their states in a higher-level manner more appropriate for building applications, check out the `VaultManager` and `VaultSource` constructs.

To get started, we should create a new Vault:

```javascript
import { Vault, init } from "buttercup";

// Initialise environment
init();

// Create an empty vault
const vault1 = new Vault();

// Create aa vault with "General" and "Trash" groups
const vault2 = Vault.createWithDefaults();
```

The `init()` function call is used to initialise the environment (performs the same function as `@buttercup/app-env` used to). It is required for Buttercup to work. It can be called more than once without effect.

Entries can't be added directly to a Vault, but can be to Groups. Creating Groups and Entries is trivial:

```javascript
const vault = Vault.createWithDefaults();
const myGroup = vault.createGroup("My Group");
const myEntry = myGroup.createEntry("My Entry");
```

Every command on Vaults, Groups and Entries **modifies the Vault instance**, but does not save it to storage. There is no command or need to commit any data - each instance links back to the original Vault. Vaults are saved and loaded using Datasources:

```javascript
import { Credentials, FileDatasource, Vault, init } from "buttercup";

init();

const datasourceCredentials = Credentials.fromDatasource({
    path: "./user.bcup"
}, "masterPassword!");
const fileDatasource = new FileDatasource(datasourceCredentials);
const vault = Vault.createWithDefaults();
vault
    .createGroup("Websites")
        .createEntry("My bank")
            .setProperty("username", "user-name")
            .setProperty("password", "s3cureP4$$");

const vaultCredentials = Credentials.fromPassword("masterPassword!");
await fileDatasource.save(vault.format.history, vaultCredentials);
```

Later:

```javascript
const datasourceCredentials = Credentials.fromDatasource({
    path: "./user.bcup"
}, "masterPassword!");
const fileDatasource = new FileDatasource(datasourceCredentials);

fileDatasource
    .load(datasourceCredentials)
    .then(({ history, Format }) => Vault.createFromHistory(history, Format))
    .then(vault => {
        // ...
    });
```

Using just a datasource is not recommended as saving and loading is quite low-level and cumbersome. Check the [browser extension](https://github.com/buttercup/buttercup-browser-extension) or [desktop application](https://github.com/buttercup/buttercup-desktop) for examples of how to use the `VaultManager` and other helpful classes.

### Development

To develop Buttercup Core, clone the repository on a Linux or Mac OS machine. Ensure that you're running NodeJS version 16/18. Install all dependencies by running `npm install` in the project directory. Run the tests to ensure everything is functioning correctly: `npm test`.

## Vault Formats

Buttercup currently supports [2 concurrent vault formats](VAULT_FORMAT.md), as it is in the process of transitioning from **Format A** (legacy) to **Format B**. You can switch the operational format by doing the following:

```javascript
const { VaultFormatB, init, setDefaultFormat } = require("buttercup");

init();

setDefaultFormat(VaultFormatB);
```

Buttercup will automatically transition to using Format B as the default in some weeks or months (since v5 was released).

## Compatibility

Buttercup's compatibility is defined as the following:

 * NodeJS version 22 and up
 * Current versions of the following browsers:
   * Google Chrome
   * Mozilla Firefox
   * Safari
 * _React Native 0.60+_

_NB: React Native support is not guaranteed under all circumstances as the platform's stability for low-level operations like cryptography is questionable. Use the [mobile app](https://github.com/buttercup/buttercup-mobile) as a guideline for implementation._

Browser support is strictly dependent on:

 * Popularity
 * The availability of required crypto libaries such as `SubtleCrypto`
