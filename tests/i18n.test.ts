import { describe, expect, it } from "vitest";
import { allTranslations, catalogSections, hasKey, t, tMap } from "../src/lib/i18n";
import { canonicalPath, href, localizedPathname, matchRoute } from "../src/lib/i18n/routes";

describe("t()", () => {
    it("translates and interpolates", () => {
        expect(t("es", "magazine.post.backToIssue", { name: "Número 3" })).toBe("Volver a Número 3");
        expect(t("en", "magazine.post.backToIssue", { name: "Issue 3" })).toBe("Back to Issue 3");
    });

    it("never parses interpolated values (titles with ':' and '.')", () => {
        const title = "Una Breve Aproximación al Código Nazi: Enigma. Parte 1";
        expect(t("es", "magazine.post.title", { name: title })).toBe(title);
    });

    it("falls back to Spanish, then to the key", () => {
        expect(t("fr", "contact.title")).toBe("Contacto");
        expect(t("en", "does.not.exist")).toBe("does.not.exist");
    });

    it("exposes sections and keys", () => {
        expect(Object.keys(tMap("es", "roles"))).toEqual(["author", "editor", "illustrator", "animator"]);
        expect(hasKey("postTypes.interview")).toBe(true);
        expect(hasKey("tags")).toBe(false);
        expect(allTranslations("magazine.index.url").sort()).toEqual(["magazine", "revista"]);
    });

    it("merges catalog sections with Spanish fallbacks", () => {
        const sections = catalogSections("en", ["roles"]) as { roles: Record<string, string> };
        expect(sections.roles.author).toBe("Author");
    });

    it("credits only Héctor in the footer", () => {
        for (const locale of ["es", "en"]) {
            const credits = t(locale, "footer.webMadeBy", { profileUrl: "perfil" });
            expect(credits).toContain("Héctor Tablero Díaz");
            expect(credits).not.toContain("Ana");
        }
    });
});

describe("localized routes", () => {
    it.each([
        ["/revista/articulo/enigma", "article", "/magazine/article/enigma"],
        ["/magazine/article/enigma", "article", "/magazine/article/enigma"],
        ["/revista/article/enigma", "article", "/magazine/article/enigma"],
        ["/magazine/articulo/enigma/", "article", "/magazine/article/enigma"],
        ["/revista/articulo/enigma/increment-views", "articleViews", "/magazine/article/enigma/increment-views"],
        ["/revista/numero-3", "issue", "/magazine/numero-3"],
        ["/actividades", "activities", "/activities"],
        ["/actividades/torneo", "activity", "/activities/torneo"],
        ["/perfil/hector-tablero", "profile", "/profile/hector-tablero"],
        ["/nosotros", "about", "/about"],
        ["/contacto", "contact", "/contact"],
        ["/email-enviado", "emailSuccessful", "/email-successful"],
        ["/admin/articulos/enigma", "adminPost", "/admin/articles/enigma"],
        ["/admin/cuentas", "adminAccounts", "/admin/accounts"],
        ["/", "home", "/"]
    ])("%s → %s", (path, route, canonical) => {
        const match = matchRoute(path);
        expect(match?.route).toBe(route);
        expect(match?.canonical).toBe(canonical);
    });

    it("rejects unknown paths", () => {
        expect(matchRoute("/revista/articulo/a/b")).toBeUndefined();
        expect(matchRoute("/nope")).toBeUndefined();
    });

    it("builds links in the reader's language", () => {
        expect(href("es", "article", { url: "enigma" })).toBe("/revista/articulo/enigma");
        expect(href("en", "article", { url: "enigma" })).toBe("/magazine/article/enigma");
        expect(href("es", "adminPosts")).toBe("/admin/articulos");
        expect(canonicalPath("issue", { issue: "a b" })).toBe("/magazine/a%20b");
        expect(localizedPathname("/revista/articulo/enigma", "en")).toBe("/magazine/article/enigma");
    });
});
