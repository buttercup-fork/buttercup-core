/**
 * Conflict copies: when two devices change a synced vault file at the same
 * time, sync services keep both versions by saving one of them under a new
 * name next to the original (buttercup/buttercup-core#243). These are
 * detected by name, using the patterns each service uses, where the
 * inserted part sits between the vault's file name and its extension.
 *
 * Only distinctive patterns are recognised. Services that add a plain
 * number or device name (eg. iCloud's "vault 2.bcup", OneDrive's
 * "vault-LAPTOP.bcup") can't be told apart from other files by name.
 * Services that identify files by ID (eg. Google Drive) keep duplicates
 * under the same name instead.
 */
const CONFLICT_PATTERNS = [
    // Dropbox: "vault (Jane's conflicted copy 2026-09-24).bcup"
    // Nextcloud: "vault (conflicted copy 2026-09-24 101500).bcup"
    /^ \([^()]*conflicted copy[^()]*(?:\(\d+\))?\)$/i,
    // ownCloud / older Nextcloud: "vault_conflict-20260924-101500.bcup"
    /^_conflict-\d{8}-\d{6}$/i,
    // Syncthing: "vault.sync-conflict-20260924-101500-ABCDEFG.bcup"
    /^\.sync-conflict-\d{8}-\d{6}(?:-[A-Z0-9]{7})?$/i,
    // Seafile: "vault (SFConflict jane@example.com 2026-09-24-10-15-00).bcup"
    /^ \(SFConflict [^()]*\)$/i
];

function getBaseName(path: string): string {
    return path.split(/[\\/]/).pop();
}

function splitExtension(filename: string): [string, string] {
    const dot = filename.lastIndexOf(".");
    if (dot <= 0) return [filename, ""];
    return [filename.slice(0, dot), filename.slice(dot)];
}

/**
 * Check if a file is a sync service's conflict copy of a vault file.
 * Paths are accepted; only the file names are compared.
 * @param vaultFilename The vault's file name, eg. "vault.bcup"
 * @param candidateFilename The file name to check
 * @returns True if the candidate is a conflict copy of the vault
 */
export function isConflictCopy(vaultFilename: string, candidateFilename: string): boolean {
    const [vaultName, vaultExt] = splitExtension(getBaseName(vaultFilename));
    const candidate = getBaseName(candidateFilename);
    if (!vaultName || candidate.length <= vaultName.length + vaultExt.length) return false;
    if (!candidate.startsWith(vaultName) || !candidate.endsWith(vaultExt)) return false;
    const inserted = candidate.slice(vaultName.length, candidate.length - vaultExt.length);
    return CONFLICT_PATTERNS.some((pattern) => pattern.test(inserted));
}

/**
 * Find a vault file's conflict copies in a list of files, eg. the contents
 * of the vault's directory. Merge each into the unlocked vault with
 * `VaultSource#mergeFromCredentials`, save, and then remove it.
 * @param vaultFilename The vault's file name, eg. "vault.bcup"
 * @param filenames File names or paths to search
 * @returns The matching items from `filenames`
 */
export function findConflictCopies(vaultFilename: string, filenames: Array<string>): Array<string> {
    return filenames.filter((filename) => isConflictCopy(vaultFilename, filename));
}
