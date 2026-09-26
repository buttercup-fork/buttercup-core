// Bundles the browser specs (test/web) for Web Test Runner, with the same
// webpack setup as the web build
const fs = require("fs");
const path = require("path");
const webpackConfig = require("./webpack.config.cjs");

const WEB_TESTS = path.resolve(__dirname, "./test/web");

const specs = fs
    .readdirSync(WEB_TESTS, { recursive: true })
    .filter((file) => file.endsWith(".spec.js"))
    .sort()
    .map((file) => path.join(WEB_TESTS, file));

webpackConfig.entry = [path.join(WEB_TESTS, "index.js"), ...specs];
webpackConfig.mode = process.env.BUNDLE === "production" ? "production" : "development";
webpackConfig.output = {
    ...webpackConfig.output,
    path: path.resolve(__dirname, "./.web-test"),
    filename: "specs.js",
    clean: true
};
webpackConfig.module.rules.push({
    test: /\.(png|jpg)$/,
    use: "arraybuffer-loader"
});
const tsRule = webpackConfig.module.rules.find(
    (rule) => rule.test && /\.ts/.test(rule.test.toString())
);
tsRule.use.options.configFile = tsRule.use.options.configFile.replace(
    "tsconfig.web.json",
    "tsconfig.web.test.json"
);

module.exports = webpackConfig;
