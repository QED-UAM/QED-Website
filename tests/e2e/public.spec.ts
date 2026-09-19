import { expect, test } from "@playwright/test";
import { withDb } from "./db";

test.describe("public site", () => {
    test("home page", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle("Inicio - QED");
        await expect(page.locator("footer")).toContainText("Héctor Tablero Díaz");
        await expect(page.locator("footer")).not.toContainText("Ana Xiu");
        await expect(page.locator("html")).toHaveAttribute("lang", "es");
    });

    test("every localized URL form reaches the article, with the full title", async ({ page }) => {
        for (const path of [
            "/revista/articulo/e2e-interactive",
            "/magazine/article/e2e-interactive",
            "/revista/article/e2e-interactive",
            "/magazine/articulo/e2e-interactive/"
        ]) {
            const response = await page.goto(path);
            expect(response?.status(), path).toBe(200);
            await expect(page).toHaveTitle("Título: con dos puntos. Y punto - QED");
            await expect(page.locator("article header h1")).toHaveText("Título: con dos puntos. Y punto");
        }
    });

    test("switching language keeps the page and sets the cookie", async ({ page, context }) => {
        await page.goto("/revista/articulo/e2e-interactive");
        await page.locator(".lang-menu summary").click();
        await page.getByRole("link", { name: /English|Inglés/ }).click();
        await expect(page).toHaveURL(/\/magazine\/article\/e2e-interactive$/);
        await expect(page.locator("article header h1")).toHaveText("Title: with a colon. And a dot");
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === "lang")?.value).toBe("en");
    });

    test("untranslated content falls back to Spanish with a mark", async ({ page, context }) => {
        await context.addCookies([{ name: "lang", value: "en", url: "http://127.0.0.1:4401" }]);
        await page.goto("/magazine/article/e2e-no-authors");
        await expect(page.locator("h1 .untranslated")).toContainText("Sin autores");
        // Issues only list the posts written in the reader's language.
        await page.goto("/magazine/e2e-issue");
        await expect(page.getByRole("link", { name: "Title: with a colon. And a dot" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Sin autores" })).toHaveCount(0);
    });

    test("posts without authors render; hidden magazines don't", async ({ page }) => {
        expect((await page.goto("/revista/articulo/e2e-no-authors"))?.status()).toBe(200);
        expect((await page.goto("/revista/articulo/e2e-hidden-post"))?.status()).toBe(404);
        expect((await page.goto("/revista/e2e-hidden"))?.status()).toBe(404);
        await expect(page.locator("#display")).toBeVisible();
    });

    test("a read is counted once per browser", async ({ page }) => {
        const views = () => withDb(async (db) => (await db.collection("posts").findOne({ url: "e2e-no-authors" }))?.views);
        const before = await views();
        // Counted after scrolling past half the page (or at once if it fits on screen).
        await page.goto("/revista/articulo/e2e-no-authors");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect.poll(views).toBe(before + 1);
        await page.reload();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        expect(await views()).toBe(before + 1);
    });

    test("activities paginate and fall back to page 1", async ({ page }) => {
        await page.goto("/actividades?page=999");
        await expect(page.getByRole("link", { name: "Actividad interactiva" })).toBeVisible();
        await expect(page.getByText("01/01/2020")).toBeVisible();
    });

    test("profile page", async ({ page }) => {
        await page.goto("/perfil/e2e-author");
        await expect(page.locator("h1")).toHaveText("Autora de Prueba");
        await expect(page.getByRole("link", { name: "Título: con dos puntos. Y punto" })).toBeVisible();
    });

    test("contact form validates and sends", async ({ page }) => {
        await page.goto("/contacto");
        await page.fill("input[name=name]", "Tester");
        await page.fill("input[name=email]", "not-an-email");
        await page.fill("textarea[name=message]", "Hola");
        await page.locator("form[method=POST]").evaluate((form: HTMLFormElement) => form.submit());
        await expect(page.getByRole("alert")).toContainText("no parece válido");
        await expect(page.locator("input[name=name]")).toHaveValue("Tester");

        await page.fill("input[name=email]", "tester@example.com");
        await page.getByRole("button", { name: "Enviar" }).click();
        await expect(page).toHaveURL(/\/email-enviado$/);
    });

    test("error page calculator works", async ({ page }) => {
        expect((await page.goto("/no-existe"))?.status()).toBe(404);
        for (const key of ["2", "+", "3", "="]) await page.locator(".calc-key", { hasText: key }).first().click();
        await expect(page.locator("#display")).toHaveAttribute("aria-label", "5");
    });

    test("health endpoint reports the database", async ({ request }) => {
        expect((await request.get("/endpoints/health")).status()).toBe(200);
    });
});
