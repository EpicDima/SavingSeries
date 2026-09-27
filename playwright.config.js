import {defineConfig} from "@playwright/test";

const PORT = 5392;
const IS_CI = !!process.env.CI;

// В CI — Chrome из образа раннера и уже собранный dist/: без скачивания браузера и второй сборки.
const SERVER_COMMAND = IS_CI ? "preview" : "serve";

export default defineConfig({
    testDir: "./e2e",
    testMatch: "**/*.spec.js",
    fullyParallel: true,
    forbidOnly: IS_CI,
    reporter: IS_CI ? [["list"], ["github"]] : [["list"]],
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        locale: "ru-RU",
        timezoneId: "UTC",
        viewport: {width: 1400, height: 800},
        trace: "retain-on-failure",
    },
    projects: [
        {name: "chromium", use: {browserName: "chromium", channel: IS_CI ? "chrome" : undefined}},
    ],
    webServer: {
        command: `node node_modules/vite/bin/vite.js ${SERVER_COMMAND} --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: false,
        env: {BROWSER: "none"},
    },
});
