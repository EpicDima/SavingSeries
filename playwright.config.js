import {defineConfig} from "@playwright/test";

const PORT = 5392;

export default defineConfig({
    testDir: "./e2e",
    testMatch: "**/*.spec.js",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: [["list"]],
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        locale: "ru-RU",
        timezoneId: "UTC",
        viewport: {width: 1400, height: 800},
        trace: "retain-on-failure",
    },
    projects: [
        {name: "chromium", use: {browserName: "chromium"}},
    ],
    webServer: {
        command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: false,
        env: {BROWSER: "none"},
    },
});
