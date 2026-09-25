import hashJS from "hash.js";

export function hashHistory(history: Array<string>): string {
    return hashJS.sha256().update(history.join("\n")).digest("hex");
}
