import { Group } from "../core/Group.js";
import { Vault } from "../core/Vault.js";
import { VaultInsights } from "../types.js";

const DIGITS = /[0-9]+/;
const LOWER_CASE = /[a-z]+/;
const OTHER = /[^0-9a-zA-Z`~!@#$%^&*()=+\[\]{};:'",.<>\/?|\\_£€-]+/;
const SYMBOLS = /[`~!@#$%^&*()=+\[\]{};:'",.<>\/?|\\_£€-]+/;
const UPPER_CASE = /[A-Z]+/;

/**
 * Generate insights for a vault instance
 * @param vault The vault instance
 * @private
 */
export function generateVaultInsights(vault: Vault): VaultInsights {
    let groupCount = 0,
        entryCount = 0,
        trashEntryCount = 0,
        trashGroupCount = 0,
        longestPasswordLength: number | null = null,
        shortestPasswordLength: number | null = null,
        weakPasswords = 0,
        expiredPasswords = 0;
    const passwordCounts: { [password: string]: number } = {};
    const usernameSet = new Set();
    const entryPasswordLengths: Array<number> = [];
    const processGroup = (group: Group) => {
        const entries = group.getEntries();
        groupCount += 1;
        entryCount += entries.length;
        entries.forEach((entry) => {
            // A linked password belongs to another entry, which counts it
            const password =
                entry.getPropertyLink("password") && !entry.isPropertyLinkBroken("password")
                    ? undefined
                    : (entry.getProperty("password") as string | undefined);
            if (typeof password === "string") {
                entryPasswordLengths.push(password.length);
                if (longestPasswordLength === null || password.length > longestPasswordLength) {
                    longestPasswordLength = password.length;
                }
                if (shortestPasswordLength === null || password.length < shortestPasswordLength) {
                    shortestPasswordLength = password.length;
                }
            }
            if (!group.isTrash() && entry.hasExpiredPassword() && !entry.isInTrash()) {
                expiredPasswords += 1;
            }
            const username = entry.getProperty("username");
            if (["login", "website"].includes(entry.getType())) {
                if (username) {
                    usernameSet.add(username);
                }
                if (password) {
                    passwordCounts[password] = (passwordCounts[password] || 0) + 1;
                    if (isWeak(password)) {
                        weakPasswords += 1;
                    }
                }
            }
        });
        group.getGroups().forEach((subGroup) => processGroup(subGroup));
    };
    vault.getGroups().forEach((group) => processGroup(group));
    const avgPassLen =
        entryPasswordLengths.reduce((total, next) => total + next, 0) / entryPasswordLengths.length;
    const trashGroup = vault.getTrashGroup();
    if (trashGroup) {
        const processTrashGroup = (group: Group) => {
            const subGroups = group.getGroups();
            trashGroupCount += subGroups.length;
            subGroups.forEach((subGroup) => processTrashGroup(subGroup));
            trashEntryCount += group.getEntries().length;
        };
        processTrashGroup(trashGroup);
    }
    const duplicatePasswords = Object.keys(passwordCounts).reduce(
        (total, nextPass) => total + (passwordCounts[nextPass] > 1 ? passwordCounts[nextPass] : 0),
        0
    );
    return {
        avgPassLen,
        entries: entryCount,
        groups: groupCount,
        longPassLen: longestPasswordLength,
        shortPassLen: shortestPasswordLength,
        trashEntries: trashEntryCount,
        trashGroups: trashGroupCount,
        usernames: usernameSet.size,
        duplicatePasswords,
        expiredPasswords,
        weakPasswords
    };
}

function isWeak(password: string): boolean {
    if (!password) return true;
    if (password.length < 10) return true;
    const matchingSets = [DIGITS, LOWER_CASE, OTHER, SYMBOLS, UPPER_CASE].filter((set) =>
        set.test(password)
    ).length;
    if (matchingSets >= 3) return false;
    return true;
}
