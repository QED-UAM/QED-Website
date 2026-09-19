import { execSync } from "node:child_process";
import { E2E_MONGODB_URI } from "../../playwright.config";

export default function globalSetup() {
    execSync("npx tsx scripts/seed-e2e.ts", {
        stdio: "inherit",
        env: { ...process.env, SOURCE_URI: "none", TEST_URI: E2E_MONGODB_URI }
    });
}
