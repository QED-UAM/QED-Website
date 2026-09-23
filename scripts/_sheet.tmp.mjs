import { chromium } from "@playwright/test";
const out = `C:/Users/hecto/AppData/Local/Temp/claude/C--Users-hecto-Desktop-QED/52b0c3ee-bdc5-4802-8533-9b2626b4613d/scratchpad/sheet.png`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto("http://127.0.0.1:4400/", { waitUntil: "load", referer: "http://127.0.0.1:4400/" });
await page.waitForTimeout(2500);
const shots = [];
for (let i = 0; i < 20; i++) {
    const name = await page.locator("[data-figure-caption]").textContent();
    const buffer = await page.locator("[data-figure]").first().screenshot();
    shots.push({ name, data: buffer.toString("base64") });
    await page.locator("[data-figure]").first().click();
    await page.waitForTimeout(700);
}
const sheet = await context.newPage();
await sheet.setViewportSize({ width: 1500, height: 1300 });
await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;background:#f7f8fb;font:14px sans-serif">${shots.map((s) => `<div style="text-align:center"><img src="data:image/png;base64,${s.data}" style="width:100%"><div>${s.name}</div></div>`).join("")}</body>`);
await sheet.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("sheet done");
