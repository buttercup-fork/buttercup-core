// Type declarations for dependencies that don't ship their own, covering only
// what this library uses

declare module "fast-levenshtein" {
    const levenshtein: {
        get(str1: string, str2: string, options?: { useCollator?: boolean }): number;
    };
    export = levenshtein;
}

declare module "foreachasync" {
    export function forEachAsync<T>(
        items: Array<T>,
        callback: (item: T, index: number, items: Array<T>) => unknown
    ): Promise<unknown>;
}

declare module "global" {
    const globals: { [key: string]: unknown };
    export = globals;
}

declare module "iocane/web" {
    export * from "iocane";
}

declare module "pako" {
    namespace pako {
        interface Options {
            level?: number;
        }
        function gzip(data: string | Uint8Array, options: Options & { to: "string" }): string;
        function gzip(data: string | Uint8Array, options?: Options): Uint8Array;
        function ungzip(data: string | Uint8Array, options: { to: "string" }): string;
        function ungzip(data: string | Uint8Array): Uint8Array;
    }
    export = pako;
}

declare module "path-posix" {
    import { posix } from "path";
    export = posix;
}

declare module "uuid" {
    namespace uuid {
        function v4(): string;
    }
    export = uuid;
}
