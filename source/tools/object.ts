import { Layerr } from "layerr";
import { ErrorCode } from "./error.js";

/**
 * Whether an object has a key of its own. Field and attribute names are
 * user-controlled, so a plain `obj[name]` or `obj.hasOwnProperty(name)` can hit
 * Object.prototype (`toString`, `constructor`) or a stored field that shadows it
 * (a field named `hasOwnProperty`).
 */
export function hasOwn(obj: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Throw if a property or attribute name can't be stored safely. Assigning
 * `__proto__` on a plain object replaces its prototype instead of storing a
 * value, so the name is refused.
 */
export function assertValidPropertyName(name: string): void {
    if (name === "__proto__") {
        throw new Layerr(
            { info: { code: ErrorCode.InvalidPropertyName } },
            `Invalid property or attribute name: ${name}`
        );
    }
}
