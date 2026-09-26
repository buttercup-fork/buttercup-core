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

declare module "iocane/web" {
    export * from "iocane";
}

declare module "pako" {
    interface Options {
        level?: number;
    }
    export function gzip(data: string | Uint8Array, options: Options & { to: "string" }): string;
    export function gzip(data: string | Uint8Array, options?: Options): Uint8Array;
    export function ungzip(data: string | Uint8Array, options: { to: "string" }): string;
    export function ungzip(data: string | Uint8Array): Uint8Array;
    const pako: {
        gzip: typeof gzip;
        ungzip: typeof ungzip;
    };
    export default pako;
}

declare module "path-posix" {
    import { posix } from "path";
    export default posix;
}
