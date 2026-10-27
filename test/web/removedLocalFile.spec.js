import * as Buttercup from "../../source/index.web.js";
import { Credentials } from "../../source/index.web.js";
import { credentialsToDatasource } from "../../source/datasources/register.js";

// The "localfile" datasource talked to desktop's Secure File Host on port 12821,
// which desktop removed (B-578, D-046). Nothing in the web build may reach it.
describe("removed local file client", function () {
    it("is not exported from the web build", function () {
        expect("LocalFileDatasource" in Buttercup).to.equal(false);
        expect("localFileClient" in Buttercup).to.equal(false);
    });

    it("has no datasource registered for the localfile type", function () {
        const credentials = Credentials.fromDatasource({
            type: "localfile",
            path: "/x",
            token: "t"
        });
        let message = "no error";
        try {
            credentialsToDatasource(credentials);
        } catch (err) {
            message = err.message;
        }
        expect(message).to.equal("No datasource found for type: localfile");
    });
});
