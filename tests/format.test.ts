import { describe, expect, it } from "vitest";
import { boardRoleKey, localize, longDate, schoolYear, shortDate } from "../src/lib/format";
import { parseMD } from "../src/lib/markdown";
import { validateContact, rateLimited } from "../src/lib/email/contact";
import { AdminError, boardYears, cleanLocalized, saveAdmins, saveMagazine, saveProfile } from "../src/lib/admin/service";

describe("localize()", () => {
    it("uses the requested language when present (even if empty)", () => {
        expect(localize({ es: "Hola", en: "Hello" }, "en")).toEqual({ value: "Hello", missing: false });
        expect(localize({ es: "Hola", en: "" }, "en")).toEqual({ value: "", missing: false });
    });

    it("falls back to Spanish and reports the missing translation", () => {
        expect(localize({ es: "Hola" }, "en")).toEqual({ value: "Hola", missing: true });
        expect(localize(undefined, "en")).toEqual({ value: "", missing: true });
    });
});

describe("dates", () => {
    const date = new Date("2025-03-05T10:00:00Z");

    it("formats like the previous site", () => {
        expect(shortDate(date)).toBe("05/03/2025");
        expect(longDate(date, "es")).toBe("5 de marzo de 2025");
        expect(longDate(date, "en")).toBe("March 5, 2025");
    });

    it("uses Madrid time, not the container's UTC", () => {
        expect(shortDate(new Date("2025-03-05T23:30:00Z"))).toBe("06/03/2025");
    });

    it("starts the school year in September", () => {
        expect(schoolYear(new Date("2025-08-31T12:00:00Z"))).toBe("2024-25");
        expect(schoolYear(new Date("2025-09-01T12:00:00Z"))).toBe("2025-26");
        expect(boardYears(new Date("2023-05-01"))).toEqual(["2021-22", "2022-23", "2023-24"]);
    });

    it("labels board roles", () => {
        expect(boardRoleKey("president")).toBe("profile.role.president");
        expect(boardRoleKey("member")).toBe("admin.directiveBoard.roles.member");
        expect(boardRoleKey("president", false)).toBe("admin.directiveBoard.roles.president");
    });
});

describe("markdown", () => {
    it("resolves containers with and without a language suffix", () => {
        expect(parseMD("::: container didyouknow.en\nx\n:::", { locale: "es" })).toContain("Did you know...?");
        expect(parseMD("::: container didyouknow\nx\n:::", { locale: "en" })).toContain("Did you know...?");
        expect(parseMD("::: container didyouknow\nx\n:::", { locale: "es" })).toContain("¿Sabías que...?");
    });

    it("escapes interactive-component attributes without changing their values", () => {
        const html = parseMD("::: js Demo\n\"it's\", 1\ndemo1\nautoPlay, h=64\n:::");
        expect(html).toContain(`data-params='&quot;it&#39;s&quot;, 1'`);
        expect(html).toContain('id="interactive-container-demo1"');
        expect(html).toContain("toggleControls('demo1')");
    });

    it("lazy-loads images", () => {
        expect(parseMD("![caption](/a.png)")).toContain('loading="lazy"');
    });
});

describe("contact form", () => {
    it("validates input", () => {
        expect(validateContact({ name: "", email: "a@b.co", message: "hi" })).toEqual({ ok: false, error: "required" });
        expect(validateContact({ name: "A", email: "nope", message: "hi" })).toEqual({ ok: false, error: "email" });
        expect(validateContact({ name: " A ", email: "a@b.co", message: " hi " })).toEqual({
            ok: true,
            value: { name: "A", email: "a@b.co", message: "hi" }
        });
    });

    it("rate-limits repeated messages", () => {
        const client = `test-${Math.random()}`;
        for (let i = 0; i < 5; i++) expect(rateLimited(client)).toBe(false);
        expect(rateLimited(client)).toBe(true);
    });
});

describe("admin validation (before touching the database)", () => {
    it("keeps Spanish and the non-empty translations", () => {
        expect(cleanLocalized({ es: "  ", en: " Hi ", fr: "x" })).toEqual({ es: "", en: "Hi" });
    });

    const problems = async (work: Promise<unknown>) => {
        try {
            await work;
        } catch (error) {
            return (error as AdminError).problems.map((problem) => problem.key);
        }
        return [];
    };

    it("rejects bad URLs, emails and board entries", async () => {
        expect(await problems(saveMagazine("x", { url: "ab", cover: "", visible: true }))).toEqual(["url"]);
        expect(await problems(saveAdmins(["ok@example.com", "broken"]))).toEqual(["email"]);
        expect(
            await problems(
                saveProfile("x", {
                    url: "valid-url",
                    name: "",
                    photo: "",
                    socialMedia: { email: "nope" },
                    directiveBoard: [
                        { year: "2024-25", role: "president" },
                        { year: "2024-25", role: "member" },
                        { year: "2023-24", role: "king" },
                        { year: "last year", role: "member" }
                    ]
                })
            )
        ).toEqual(["email", "duplicateYear", "invalidRole", "invalidYear"]);
    });
});
