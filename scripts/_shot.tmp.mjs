// usage: BASE=http://127.0.0.1:4500 node shot.mjs <path> <name> [width] [theme] [lang] [fullPage|selector]
import { chromium } from "@playwright/test";
const base = process.env.BASE ?? "http://127.0.0.1:4400";
const [path, name, width = "1440", theme = "light", lang = "es", full = "1"] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1, colorScheme: theme === "dark" ? "dark" : "light" });
await context.addCookies([{ name: "lang", value: lang, url: base }]);
await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto(base + path, { waitUntil: "load", referer: base + "/" });
const out = `C:/Users/hecto/AppData/Local/Temp/claude/C--Users-hecto-Desktop-QED/52b0c3ee-bdc5-4802-8533-9b2626b4613d/scratchpad/${name}.png`;
if (full !== "1" && full !== "0") {
    const el = page.locator(full).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    await el.screenshot({ path: out });
} else {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: out, fullPage: full === "1" });
}
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
