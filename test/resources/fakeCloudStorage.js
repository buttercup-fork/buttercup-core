/**
 * In-memory fakes of the Dropbox and Google Drive HTTP APIs, used by
 * patching a datasource client's "request" hot-patcher method. They cover
 * the requests made by @buttercup/dropbox-client, @buttercup/googledrive-client
 * and core's attachment code - enough for vault load/save plus attachments.
 */

function toBytes(body) {
    if (body === undefined || body === null) return new Uint8Array(0);
    if (typeof body === "string") return new Uint8Array(Buffer.from(body, "utf8"));
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
}

function respond(status, payload = new Uint8Array(0)) {
    const bytes = typeof payload === "string" ? toBytes(payload) : payload;
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: String(status),
        url: "",
        headers: { get: () => null },
        text: () => Promise.resolve(Buffer.from(bytes).toString("utf8")),
        json: () => Promise.resolve(JSON.parse(Buffer.from(bytes).toString("utf8"))),
        arrayBuffer: () =>
            Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length))
    });
}

function respondJSON(status, value) {
    return respond(status, JSON.stringify(value));
}

export function createFakeDropbox() {
    const files = new Map(); // path (lower-cased, like Dropbox) -> bytes
    const requests = [];
    const key = (path) => path.toLowerCase();
    const request = (config) => {
        requests.push(config);
        const { url, headers = {}, query = {} } = config;
        if (url === "https://content.dropboxapi.com/2/files/download") {
            const { path } = JSON.parse(headers["Dropbox-API-Arg"] || query.arg);
            if (!files.has(key(path)))
                return respondJSON(409, { error_summary: "path/not_found/" });
            return respond(200, files.get(key(path)));
        }
        if (url === "https://content.dropboxapi.com/2/files/upload") {
            const { path } = JSON.parse(query.arg);
            files.set(key(path), toBytes(config.body));
            return respondJSON(200, { path_display: path });
        }
        if (url === "https://api.dropboxapi.com/2/files/delete_v2") {
            const { path } = JSON.parse(config.body);
            if (!files.has(key(path)))
                return respondJSON(409, { error_summary: "path_lookup/not_found/" });
            files.delete(key(path));
            return respondJSON(200, {});
        }
        return respondJSON(400, { error: `Unexpected request: ${config.method} ${url}` });
    };
    return { files, request, requests };
}

export function createFakeGoogleDrive({ seedFiles = {} } = {}) {
    const FOLDER = "application/vnd.google-apps.folder";
    const items = new Map(); // id -> { id, name, parents, mimeType, data }
    const requests = [];
    let nextID = 1;
    Object.keys(seedFiles).forEach((id) => {
        items.set(id, {
            id,
            name: id,
            parents: ["root"],
            mimeType: "text/plain",
            data: toBytes(seedFiles[id])
        });
    });
    const create = (props) => {
        const id = `item${nextID++}`;
        items.set(id, { id, parents: ["root"], mimeType: "application/octet-stream", ...props });
        return id;
    };
    const request = (config) => {
        requests.push(config);
        const { method, url, query = {} } = config;
        const filesMatch = /^https:\/\/www\.googleapis\.com\/drive\/v3\/files(?:\/([^/?]+))?$/.exec(
            url
        );
        const uploadMatch =
            /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files(?:\/([^/?]+))?$/.exec(url);
        if (filesMatch && !filesMatch[1] && method === "GET") {
            return respondJSON(200, { files: search(items, query.q, FOLDER) });
        }
        if (filesMatch && !filesMatch[1] && method === "POST") {
            const { name, mimeType, parents } = JSON.parse(config.body);
            return respondJSON(200, { id: create({ name, mimeType, parents }) });
        }
        if (filesMatch && filesMatch[1]) {
            const item = items.get(decodeURIComponent(filesMatch[1]));
            if (!item) return respondJSON(404, { error: "notFound" });
            if (method === "GET" && query.alt === "media") return respond(200, item.data);
            if (method === "DELETE") {
                items.delete(item.id);
                return respond(204);
            }
        }
        if (uploadMatch) {
            const id = uploadMatch[1] && decodeURIComponent(uploadMatch[1]);
            if (id && !items.has(id)) return respondJSON(404, { error: "notFound" });
            let metadata = {};
            let data;
            if (query.uploadType === "multipart") {
                ({ metadata, data } = parseMultipart(config));
            } else {
                data = toBytes(config.body);
            }
            if (id) {
                Object.assign(items.get(id), metadata, { data });
                return respondJSON(200, { id });
            }
            return respondJSON(200, { id: create({ ...metadata, data }) });
        }
        return respondJSON(400, { error: `Unexpected request: ${method} ${url}` });
    };
    return { items, request, requests };
}

function search(items, q, folderMime) {
    const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)[1].replace(/\\(.)/g, "$1");
    const parent = /'((?:[^'\\]|\\.)*)' in parents/.exec(q)[1];
    const wantFolder = q.includes(`mimeType = '${folderMime}'`);
    return [...items.values()]
        .filter(
            (item) =>
                item.name === name &&
                item.parents.includes(parent) &&
                (item.mimeType === folderMime) === wantFolder
        )
        .map((item) => ({ id: item.id }));
}

function parseMultipart(config) {
    const contentType = config.headers["Content-Type"];
    const boundary = /boundary=(.+)$/.exec(contentType)[1];
    const body = Buffer.from(toBytes(config.body));
    const delimiter = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = body.indexOf(delimiter);
    while (start !== -1) {
        const next = body.indexOf(delimiter, start + delimiter.length);
        if (next === -1) break;
        parts.push(body.subarray(start + delimiter.length, next));
        start = next;
    }
    const [metaPart, dataPart] = parts.map((part) => {
        const headerEnd = part.indexOf("\r\n\r\n");
        const headers = part.subarray(0, headerEnd).toString("utf8");
        // Strip the CRLF that precedes the next delimiter
        let content = part.subarray(headerEnd + 4, part.length - 2);
        if (/Content-Transfer-Encoding: base64/i.test(headers)) {
            content = Buffer.from(content.toString("utf8"), "base64");
        }
        return content;
    });
    return {
        metadata: JSON.parse(metaPart.toString("utf8")),
        data: new Uint8Array(dataPart)
    };
}
