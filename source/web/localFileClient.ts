import joinURL from "url-join";
import { getSharedAppEnv } from "../env/appEnv.js";

const BASE_URL = "http://localhost:12821";

type Callback = (err?: Error | null, result?: any) => void;

export function buildClient(token: string) {
    const encrypt = getSharedAppEnv().getProperty("crypto/v1/encryptText");
    const decrypt = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    return {
        readdir: (remotePath: string, callback: Callback) => {
            const url = joinURL(BASE_URL, "/get/directory");
            encrypt(remotePath, token)
                .then((payload: string) =>
                    fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: JSON.stringify({
                            payload
                        })
                    })
                )
                .then((response: Response) => {
                    if (response.ok && response.status === 200) {
                        return response.json();
                    }
                    throw new Error(`Failed reading remote file: ${remotePath}`);
                })
                .then((response: { payload: string }) => decrypt(response.payload, token))
                .then(JSON.parse)
                .then((results: any) => callback(null, results))
                .catch(callback);
        },

        readFile: (remotePath: string, options: object | Callback, callback?: Callback) => {
            const encrypt = getSharedAppEnv().getProperty("crypto/v1/encryptText");
            const decrypt = getSharedAppEnv().getProperty("crypto/v1/decryptText");
            const cb = (typeof options === "function" ? options : callback) as Callback;
            const url = joinURL(BASE_URL, "/get/file");
            encrypt(remotePath, token)
                .then((payload: string) =>
                    fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: JSON.stringify({
                            payload
                        })
                    })
                )
                .then((response: Response) => {
                    if (response.ok && response.status === 200) {
                        return response.json();
                    }
                    throw new Error(`Failed reading remote file: ${remotePath}`);
                })
                .then((response: { payload: string }) => decrypt(response.payload, token))
                .then((data: string) => {
                    cb(null, data);
                })
                .catch(cb);
        },

        writeFile: (
            remotePath: string,
            data: string,
            options: object | Callback,
            callback?: Callback
        ) => {
            const encrypt = getSharedAppEnv().getProperty("crypto/v1/encryptText");
            const cb = (typeof options === "function" ? options : callback) as Callback;
            if (typeof data !== "string") {
                throw new Error("Failed writing file: Expected data to be of type string");
            }
            const url = joinURL(BASE_URL, "/put/file");
            encrypt(
                JSON.stringify({
                    filename: remotePath,
                    contents: data
                }),
                token
            )
                .then((payload: string) =>
                    fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: JSON.stringify({
                            payload
                        })
                    })
                )
                .then((response: Response) => {
                    if (response.ok && response.status === 200) {
                        cb();
                        return;
                    }
                    throw new Error(`Failed writing remote file: ${remotePath}`);
                })
                .catch(cb);
        }
    };
}

export function completeConnection(code: string): Promise<string> {
    if (!code) {
        return Promise.reject(new Error("Code is required"));
    }
    const decrypt = getSharedAppEnv().getProperty("crypto/v1/decryptText");
    const codeURL = joinURL(BASE_URL, `/connect/${code}`);
    return fetch(codeURL)
        .then((response) => response.json())
        .then((resp) => {
            if (resp.status !== "ok") {
                throw new Error("Connection response status was not OK");
            }
            const { payload } = resp;
            return decrypt(payload, code);
        });
}

export function initiateConnection(): Promise<void> {
    const pingURL = BASE_URL;
    const connectURL = joinURL(BASE_URL, "/connect");
    return fetch(pingURL)
        .then((response) => response.json())
        .then((response) => {
            if (response.status !== "ok") {
                throw new Error("Received non-OK status");
            } else if (!response.ready) {
                throw new Error("Endpoint is not yet ready");
            }
            return fetch(connectURL)
                .then((response) => response.json())
                .then((response) => {
                    if (response.status !== "ok") {
                        throw new Error("Endpoint connection procedure failed");
                    }
                });
        });
}
