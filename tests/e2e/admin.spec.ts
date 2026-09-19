import { expect, test, type Page } from "@playwright/test";
import { withDb } from "./db";

async function login(page: Page) {
    await page.goto("/auth/dev?email=e2e-admin@example.com");
    await expect(page).toHaveURL(/\/admin$/);
}

async function save(page: Page) {
    await page.keyboard.press("Control+s");
    await expect(page.getByText("Cambios guardados")).toBeVisible();
}

test.describe("admin", () => {
    test("requires a login", async ({ page }) => {
        const response = await page.request.get("/admin", { maxRedirects: 0 });
        expect(response.status()).toBe(302);
        expect(response.headers().location).toBe("/auth/google");
    });

    test("post lifecycle: create, edit, author, publish, rename, delete", async ({ page }) => {
        await login(page);
        await page.goto("/admin/articulos");
        await page.getByRole("button", { name: "Nuevo artículo" }).click();
        await expect(page).toHaveURL(/\/admin\/articulos\/[0-9a-f-]{36}$/);

        await page.locator("#title-es").fill("Artículo: creado en e2e");
        await page.locator("select").first().selectOption({ label: "Número de prueba: edición.1" });
        await page.getByPlaceholder("Buscar autores...").fill("Autora");
        await page.getByRole("button", { name: "Autora de Prueba" }).click();
        await page.locator("#content-es").fill("Hola **mundo** $x^2$");
        await expect(page.locator(".md-content strong")).toHaveText("mundo");
        await page.getByRole("textbox").nth(0).fill("e2e-created");
        // Renaming reloads the editor at its new URL.
        await Promise.all([page.waitForURL(/\/admin\/articulos\/e2e-created$/), page.keyboard.press("Control+s")]);

        const stored = await withDb((db) => db.collection("posts").findOne({ url: "e2e-created" }));
        expect(stored?.title.es).toBe("Artículo: creado en e2e");
        expect(stored?.authors).toHaveLength(1);
        expect(stored?.updated_at).toBeInstanceOf(Date);

        await page.goto("/revista/articulo/e2e-created");
        await expect(page.locator("h1")).toHaveText("Artículo: creado en e2e");

        await page.goto("/admin/articulos");
        const row = page.locator("li", { hasText: "Artículo: creado en e2e" });
        await row.getByRole("button", { name: "Eliminar" }).click();
        await row.getByRole("button", { name: "Confirmar" }).click();
        await expect(row).toHaveCount(0);
        expect(await withDb((db) => db.collection("posts").countDocuments({ url: "e2e-created" }))).toBe(0);
    });

    test("invalid URLs are rejected with a message", async ({ page }) => {
        await login(page);
        await page.goto("/admin/revistas/e2e-issue");
        await page.getByRole("textbox").nth(0).fill("ab");
        await page.keyboard.press("Control+s");
        await expect(page.getByText(/al menos 4 caracteres/).first()).toBeVisible();
    });

    test("deleting a profile removes it from post authors", async ({ page }) => {
        await login(page);
        const id = await withDb(async (db) => {
            const user = await db.collection("users").insertOne({ url: "e2e-temp-user", name: "Temporal", socialMedia: {}, about: { es: "" } });
            await db.collection("posts").updateOne({ url: "e2e-no-authors" }, { $push: { authors: { user_id: user.insertedId, role: "editor" } } } as never);
            return user.insertedId;
        });
        await page.goto("/admin/perfiles");
        const row = page.locator("li", { hasText: "Temporal" });
        await row.getByRole("button", { name: "Eliminar" }).click();
        await row.getByRole("button", { name: "Confirmar" }).click();
        await expect(row).toHaveCount(0);
        const post = await withDb((db) => db.collection("posts").findOne({ url: "e2e-no-authors" }));
        expect(post?.authors.some((author: { user_id: { equals(other: unknown): boolean } }) => author.user_id.equals(id))).toBe(false);
    });

    test("news can be published and removed", async ({ page }) => {
        await login(page);
        await page.goto("/admin/noticias");
        await page.locator("#title-es").fill("Noticia e2e");
        await page.locator("#description-es").fill("Texto de la *noticia*");
        await save(page);
        await page.goto("/");
        await expect(page.locator("#news-title")).toHaveText("Noticia e2e");

        await page.goto("/admin/noticias");
        await page.locator("#title-es").fill("");
        await page.locator("#description-es").fill("");
        await page.keyboard.press("Control+s");
        await expect(page.getByText(/Noticia eliminada/)).toBeVisible();
        expect(await withDb((db) => db.collection("news").countDocuments())).toBe(0);
    });

    test("accounts: QED email stays, others can be added and removed", async ({ page }) => {
        await login(page);
        await page.goto("/admin/cuentas");
        await page.getByPlaceholder("Añade un nuevo correo de administrador").fill("nuevo@example.com");
        await page.getByRole("button", { name: "Añadir Email" }).click();
        await save(page);
        expect(await withDb((db) => db.collection("admins").countDocuments({ email: "nuevo@example.com" }))).toBe(1);

        await page.locator("li", { hasText: "nuevo@example.com" }).getByRole("button", { name: "Eliminar" }).click();
        await save(page);
        expect(await withDb((db) => db.collection("admins").countDocuments({ email: "nuevo@example.com" }))).toBe(0);
        expect(await withDb((db) => db.collection("admins").countDocuments({ email: "e2e-admin@example.com" }))).toBe(1);
    });

    test("logout ends the session", async ({ page }) => {
        await login(page);
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
        await expect(page).toHaveURL(/\/$/);
        const response = await page.request.get("/admin", { maxRedirects: 0 });
        expect(response.status()).toBe(302);
    });
});
