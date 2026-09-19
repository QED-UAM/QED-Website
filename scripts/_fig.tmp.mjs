import { chromium } from "@playwright/test";
const out = (n) => `C:/Users/hecto/AppData/Local/Temp/claude/C--Users-hecto-Desktop-QED/52b0c3ee-bdc5-4802-8533-9b2626b4613d/scratchpad/${n}.png`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:4500/", { waitUntil: "networkidle", referer: "http://127.0.0.1:4500/" });
await page.waitForTimeout(1500);
for (let i = 0; i < 3; i++) {
  const name = await page.locator("[data-figure-name]").textContent();
  await page.locator("#hero-figure").screenshot({ path: out(`fig-${i}`) });
  console.log(i, name);
  await page.locator("#hero-figure").click();
  await page.waitForTimeout(1500);
}
await browser.close();
