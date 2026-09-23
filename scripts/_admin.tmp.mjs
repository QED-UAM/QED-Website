import { chromium } from "@playwright/test";
const out = (n) => `C:/Users/hecto/AppData/Local/Temp/claude/C--Users-hecto-Desktop-QED/52b0c3ee-bdc5-4802-8533-9b2626b4613d/scratchpad/${n}.png`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const base = "http://127.0.0.1:4400";
let r = await page.goto(base + "/admin");
console.log("admin before login ->", page.url());
r = await page.goto(base + "/auth/dev");
console.log("after dev login ->", page.url(), r.status());
await page.screenshot({ path: out("admin-dash") });
for (const [path, name] of [["/admin/articulos", "admin-posts"], ["/admin/articulos/e2e-interactive", "admin-post"], ["/admin/perfiles/e2e-author", "admin-profile"], ["/admin/cuentas", "admin-accounts"]]) {
  const res = await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  console.log(path, res.status());
  await page.screenshot({ path: out(name), fullPage: true });
}
console.log(errors.join("\n") || "no errors");
await browser.close();
