export function objectValues(obj: Object): Array<any> {
    return Object.keys(obj).map((key) => (obj as { [key: string]: any })[key]);
}
