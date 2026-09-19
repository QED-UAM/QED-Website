// Contract test for the interactive-component runtime used by the articles stored in the
// database (docs/interactive-components.md). The fixture component in scripts/seed-e2e.ts
// counts iterations of `main()` and exercises every option articles use.
import { expect, test, type Page } from "@playwright/test";

const count = (page: Page, instance: string) =>
    page
        .locator(`#interactive-container-${instance} .fixture-counter`)
        .textContent()
        .then((text) => Number(text?.replace("count:", "") ?? NaN));

for (const path of ["/revista/articulo/e2e-interactive", "/actividades/e2e-activity"]) {
    test.describe(`interactive components on ${path}`, () => {
        test("globals and markup contract", async ({ page }) => {
            await page.goto(path);
            const globals = await page.evaluate(() => ({
                bg: (window as unknown as { eval: (code: string) => string }).eval("ielightbgrgb"),
                darkBg: (window as unknown as { eval: (code: string) => string }).eval("iedarkbgrgb"),
                toggle: typeof (window as unknown as { toggleControls: unknown }).toggleControls,
                activate: typeof (window as unknown as { activateInteractiveElements: unknown }).activateInteractiveElements,
                registry: Object.keys((window as unknown as { interactiveElements: object }).interactiveElements ?? {}),
                lang: (document.getElementById("current-lang-icon") as HTMLImageElement | null)?.alt
            }));
            expect(globals).toEqual({
                bg: "rgb(255, 255, 255)",
                darkBg: "rgb(26, 34, 54)",
                toggle: "function",
                activate: "function",
                registry: ["FixtureCounter"],
                lang: "ES"
            });
            await expect(page.locator("#interactive-container-fixtureAll")).toHaveCSS("height", "256px");
            const background = await page.locator("#interactive-container-fixtureAuto .interactive-content").evaluate(
                (element) => getComputedStyle(element).backgroundColor
            );
            expect(background).toBe("rgb(255, 255, 255)");
        });

        test("autoPlay, noStop and autoPauseOnScroll", async ({ page }) => {
            await page.goto(path);
            const auto = page.locator("#interactive-container-fixtureAuto .fixture-counter");
            await page.locator("#interactive-container-fixtureAuto").scrollIntoViewIfNeeded();
            await expect(auto).toBeVisible();
            await expect.poll(() => count(page, "fixtureAuto")).toBeGreaterThan(110);
            await expect(page.locator("#controls-fixtureAuto")).not.toContainText("Detener");

            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(300);
            const paused = await page.evaluate(() => (window as unknown as { fixtureAuto: { running: boolean } }).fixtureAuto.running);
            expect(paused).toBe(false);
        });

        test("play, pause, resume, save state, clear, stop and reset", async ({ page }) => {
            await page.goto(path);
            await page.evaluate(() => localStorage.removeItem("interactiveElementStates"));
            const controls = page.locator("#controls-fixtureAll");
            await expect(controls).toHaveClass(/h-fit/); // openControls

            await page.locator("#play-button-fixtureAll").click();
            await expect(page.locator("#overlay-fixtureAll")).toBeHidden();
            await expect(page.locator("#interactive-container-fixtureAll .fullscreen-link")).toHaveCount(1);
            await expect.poll(() => count(page, "fixtureAll")).toBeGreaterThan(60);

            await controls.getByText("Pausar").click();
            const pausedAt = await count(page, "fixtureAll");
            await page.waitForTimeout(400);
            expect(await count(page, "fixtureAll")).toBe(pausedAt);
            await controls.getByText("Reanudar").click();
            await expect.poll(() => count(page, "fixtureAll")).toBeGreaterThan(pausedAt);

            const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("interactiveElementStates") ?? "{}"));
            const slug = path.split("/").pop()!;
            expect(saved[slug].FixtureCounter.fixtureAll.count).toBeGreaterThanOrEqual(50);

            await controls.getByText("Borrar Datos").click();
            const cleared = await page.evaluate(() => localStorage.getItem("interactiveElementStates"));
            expect(cleared === null || !JSON.parse(cleared)[slug]?.FixtureCounter?.fixtureAll).toBe(true);

            await controls.getByText("Detener").click();
            await expect(page.locator("#overlay-fixtureAll")).toBeVisible();
            await expect(page.locator("#play-button-fixtureAll")).toBeVisible();

            await controls.getByText("Reiniciar").click();
            await expect(page.locator("#overlay-fixtureAll")).toBeHidden();
        });

        test("noControls hides the control bar", async ({ page }) => {
            await page.goto(path);
            await expect(page.locator("#controls-fixtureBare")).toBeHidden();
            await expect(page.locator("#controls-arrow-fixtureBare")).toBeHidden();
            await expect(page.locator("#interactive-container-fixtureBare")).toHaveClass(/rounded-b-xl/);
        });

        test("theme changes reach components through on-theme-change", async ({ page }) => {
            await page.goto(path);
            const label = page.locator("#interactive-container-fixtureAuto .fixture-counter");
            await expect(label).toHaveAttribute("data-theme", "light");
            await page.locator("[data-theme-value=dark]").click();
            await expect(page.locator("html")).toHaveClass(/dark/);
            await expect(label).toHaveAttribute("data-theme", "dark");
            const background = await page.locator("#interactive-container-fixtureAuto .interactive-content").evaluate(
                (element) => getComputedStyle(element).backgroundColor
            );
            expect(background).toBe("rgb(26, 34, 54)");
        });
    });
}

test("solution spoilers reveal on click", async ({ page }) => {
    await page.goto("/revista/articulo/e2e-interactive");
    const overlay = page.locator(".spoiler-overlay").first();
    await expect(overlay).toBeVisible();
    await overlay.click();
    await expect(overlay).toHaveCount(0);
});
