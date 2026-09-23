// Runtime configuration read from process.env. Kept framework-agnostic so the same
// module works in Astro, Vitest and the maintenance scripts under /scripts.
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// Astro/Vite don't put .env values into process.env (and `node dist/server/entry.mjs` reads
// no .env at all), so load it here. Real environment variables (Docker, CI) take precedence.
function loadDotEnv(file = path.resolve(process.cwd(), ".env")) {
    if (!fs.existsSync(file)) return;
    const values = parseEnv(fs.readFileSync(file, "utf8"));
    for (const [key, value] of Object.entries(values)) {
        if (process.env[key] === undefined) process.env[key] = value;
    }
}
loadDotEnv();

function list(value: string | undefined, fallback: string[]): string[] {
    if (!value) return fallback;
    const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return items.length > 0 ? items : fallback;
}

function int(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const env = process.env;

export const config = {
    get mongodbUri() {
        return env.MONGODB_URI || "mongodb://127.0.0.1:27017/qed";
    },
    get googleClientId() {
        return env.GOOGLE_CLIENT_ID || "";
    },
    get googleClientSecret() {
        return env.GOOGLE_CLIENT_SECRET || "";
    },
    get qedEmail() {
        return env.QED_EMAIL || "qed.uam@gmail.com";
    },
    get supportedLanguages() {
        return list(env.SUPPORTED_LANGUAGES, ["es", "en"]);
    },
    get resendApiKey() {
        return env.RESEND_API_KEY || "";
    },
    get contactFromEmail() {
        return env.CONTACT_FROM_EMAIL || "QED UAM <onboarding@resend.dev>";
    },
    get contactToEmail() {
        return env.CONTACT_TO_EMAIL || this.qedEmail;
    },
    /** Public origin, e.g. https://qed.mat.uam.es. Falls back to the request host. */
    get siteUrl() {
        return (env.SITE_URL || "").replace(/\/+$/, "");
    },
    /**
     * Seconds without a database connection before the process exits so Docker restarts it.
     * 0 disables the watchdog (the default outside production, so `astro dev` never exits).
     */
    get dbWatchdogSeconds() {
        return int(env.DB_WATCHDOG_SECONDS, env.NODE_ENV === "production" ? 60 : 0);
    },
    get isProduction() {
        return env.NODE_ENV === "production";
    }
};

export const DEFAULT_LOCALE = "es";
export const DEFAULT_AVATAR =
    "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg";
export const PLACEHOLDER_IMAGE =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/991px-Placeholder_view_vector.svg.png";
