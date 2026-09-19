import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build connected to a disposable database
// (seeded with fixtures by tests/e2e/global-setup.ts). Needs a local MongoDB.
const PORT = 4401;
export const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27017/qed_e2e_test";

export default defineConfig({
    testDir: "tests/e2e",
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    globalSetup: "./tests/e2e/global-setup.ts",
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        locale: "es-ES",
        trace: "retain-on-failure"
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npm run build && node dist/server/entry.mjs",
        url: `http://127.0.0.1:${PORT}/endpoints/health`,
        timeout: 240_000,
        reuseExistingServer: false,
        env: {
            PORT: String(PORT),
            HOST: "127.0.0.1",
            MONGODB_URI: E2E_MONGODB_URI,
            AUTH_DEV_LOGIN: "1",
            RESEND_API_KEY: "",
            SITE_URL: "",
            NODE_ENV: "test"
        }
    }
});
