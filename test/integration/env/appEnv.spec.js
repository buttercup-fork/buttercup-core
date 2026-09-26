import { expect } from "chai";
import { readFileSync } from "node:fs";
import { getSharedAppEnv } from "../../../dist/node/index.js";

describe("appEnv", function () {
    describe("compression", function () {
        describe("v1", function () {
            const compress = getSharedAppEnv().getProperty("compression/v1/compressText");
            const decompress = getSharedAppEnv().getProperty("compression/v1/decompressText");

            it("can compress and decompress text", function () {
                const compressed = compress("this is\nsome text! ");
                const decompressed = decompress(compressed);
                expect(decompressed).to.equal("this is\nsome text! ");
            });

            it("can compress and decompress special characters", function () {
                const compressed = compress("ატრიბუტი\nความคุ้มค่า");
                const decompressed = decompress(compressed);
                expect(decompressed).to.equal("ატრიბუტი\nความคุ้มค่า");
            });

            // Format A vaults saved before the pako 3 upgrade hold pako 1 output
            describe("pako 1 output", function () {
                const fixtures = JSON.parse(
                    readFileSync(
                        new URL("../../resources/compression/pako1-v1.json", import.meta.url),
                        "utf8"
                    )
                );

                fixtures.forEach(({ text, v1 }, index) => {
                    it(`decompresses fixture ${index + 1} (${text.length} characters)`, function () {
                        expect(decompress(v1)).to.equal(text);
                    });
                });
            });
        });

        describe("v2", function () {
            const compress = getSharedAppEnv().getProperty("compression/v2/compressText");
            const decompress = getSharedAppEnv().getProperty("compression/v2/decompressText");

            it("can compress and decompress text", async function () {
                const compressed = await compress("this is\nsome text! ");
                const decompressed = await decompress(compressed);
                expect(decompressed).to.equal("this is\nsome text! ");
            });

            it("can compress and decompress special characters", async function () {
                const compressed = await compress("ატრიბუტი\nความคุ้มค่า");
                const decompressed = await decompress(compressed);
                expect(decompressed).to.equal("ატრიბუტი\nความคุ้มค่า");
            });
        });
    });
});
