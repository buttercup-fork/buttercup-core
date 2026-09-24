import http from "node:http";

// An explicit IPv4 address: "localhost" can resolve to ::1 for the server
// but 127.0.0.1 for the client (eg. Node 18+ in Docker), refusing connections
const HOST = "127.0.0.1";

/**
 * Minimal mock of the Microsoft Graph endpoints OneDriveDatasource uses:
 *  - GET/PUT /v1.0/me/drive/root:/{path}:/content
 *  - GET/PUT /v1.0/me/drive/items/{id}/content
 * Downloads respond with a 302 to a separate (unauthenticated) download URL,
 * like the real API does.
 */
export function createOneDriveServer({ validTokens = ["valid-token"] } = {}) {
    const files = new Map(); // key -> contents; key is "path:<path>" or "id:<id>"
    const requests = [];
    let server = null;
    let port = null;

    const handler = (req, res) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");
            const url = new URL(req.url, `http://${HOST}:${port}`);
            requests.push({
                method: req.method,
                path: url.pathname,
                authorization: req.headers.authorization,
                contentType: req.headers["content-type"],
                body
            });
            // Pre-authenticated download URLs don't take a bearer token
            const download = /^\/download\/(.+)$/.exec(url.pathname);
            if (download && req.method === "GET") {
                const key = decodeURIComponent(download[1]);
                if (!files.has(key)) return send(res, 404);
                return send(res, 200, files.get(key));
            }
            const token = (req.headers.authorization || "").replace(/^Bearer /, "");
            if (!validTokens.includes(token)) {
                return send(
                    res,
                    401,
                    JSON.stringify({ error: { code: "InvalidAuthenticationToken" } })
                );
            }
            const byPath = /^\/v1\.0\/me\/drive\/root:\/(.+):\/content$/.exec(url.pathname);
            const byID = /^\/v1\.0\/me\/drive\/items\/([^/]+)\/content$/.exec(url.pathname);
            let key = null;
            if (byPath) key = `path:${decodeURIComponent(byPath[1])}`;
            else if (byID) key = `id:${decodeURIComponent(byID[1])}`;
            if (!key) return send(res, 400);
            if (req.method === "GET") {
                if (!files.has(key)) return send(res, 404);
                res.writeHead(302, {
                    Location: `http://${HOST}:${port}/download/${encodeURIComponent(key)}`
                });
                return res.end();
            }
            if (req.method === "PUT") {
                // Only paths can create new files - item IDs must exist
                if (byID && !files.has(key)) return send(res, 404);
                const existed = files.has(key);
                files.set(key, body);
                return send(res, existed ? 200 : 201, JSON.stringify({ id: "item" }));
            }
            send(res, 405);
        });
    };

    return {
        files,
        requests,
        get endpoint() {
            return `http://${HOST}:${port}/v1.0`;
        },
        get validTokens() {
            return validTokens;
        },
        start: () =>
            new Promise((resolve) => {
                server = http.createServer(handler);
                server.listen(0, HOST, () => {
                    port = server.address().port;
                    resolve();
                });
            }),
        stop: () => new Promise((resolve) => server.close(() => resolve()))
    };
}

function send(res, status, body = "") {
    res.writeHead(status, { "Content-Type": "text/plain" });
    res.end(body);
}
