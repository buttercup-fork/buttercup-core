import { createClient } from "webdav";
import { DropboxClient } from "@buttercup/dropbox-client";
import { OneDriveClient } from "@buttercup/onedrive-client";

export function getNetResources() {
    return {
        "net/dropbox/v1/newClient": (token: string) => new DropboxClient(token),
        "net/onedrive/v1/newClient": (token: string, endpoint?: string) =>
            new OneDriveClient(token, { endpoint }),
        "net/webdav/v1/newClient": createClient
    };
}
