// Type declarations for dependencies that don't ship their own, covering only
// what this library uses. These are CommonJS packages, so under ESM their
// `module.exports` is the default export.

declare module "fast-levenshtein" {
    const levenshtein: {
        get(str1: string, str2: string, options?: { useCollator?: boolean }): number;
    };
    export default levenshtein;
}

declare module "foreachasync" {
    export function forEachAsync<T>(
        items: Array<T>,
        callback: (item: T, index: number, items: Array<T>) => unknown
    ): Promise<unknown>;
}

declare module "global" {
    const globals: { [key: string]: unknown };
    export default globals;
}

declare module "path-posix" {
    import { posix } from "path";
    export default posix;
}
