// Runs the bundled browser specs (see webpack.test.config.cjs) with Mocha
import { chromeLauncher } from "@web/test-runner-chrome";
import { playwrightLauncher } from "@web/test-runner-playwright";
import { defaultReporter, summaryReporter } from "@web/test-runner";

const CI = !!process.env.CI;

const chrome = chromeLauncher({
    launchOptions: {
        executablePath: process.env.CHROME_BIN,
        // CI containers run as root, where Chrome won't start sandboxed
        args: CI ? ["--no-sandbox"] : []
    }
});

// Playwright's own Firefox build: Puppeteer's stock-Firefox support is still
// experimental and hangs on page setup
const firefox = playwrightLauncher({ product: "firefox" });

export default {
    browsers: CI ? [chrome, firefox] : [chrome],
    files: [".web-test/specs.js"],
    nodeResolve: false,
    reporters: [summaryReporter({ flatten: false }), defaultReporter()]
};
