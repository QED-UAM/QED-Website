import "./lib/network";
import { defineMiddleware } from "astro:middleware";
import { connectDB } from "./lib/db/connection";
import { lastSessionMiss, readSession } from "./lib/auth/session";
import { isSupportedLocale } from "./lib/i18n";
import { matchRoute } from "./lib/i18n/routes";
import { DEFAULT_LOCALE } from "./lib/config";

// Start connecting as soon as the server boots. Requests don't wait for it: queries are
// buffered by mongoose, and /endpoints/health reports the real state.
void connectDB();

const LANG_COOKIE = "lang";
const ONE_YEAR = 60 * 60 * 24 * 365;

const isAsset = (pathname: string) =>
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/_image") ||
    /\.[a-z0-9]{2,5}$/i.test(pathname);

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, locals } = context;
    locals.originalPath = url.pathname;
    locals.admin = null;

    if (isAsset(url.pathname)) return next();

    // Language: ?lang= (sets the cookie) → lang cookie → Spanish.
    const queryLang = url.searchParams.get("lang");
    if (isSupportedLocale(queryLang)) {
        cookies.set(LANG_COOKIE, queryLang, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
        if (context.request.method === "GET" && !url.pathname.startsWith("/_offline")) {
            url.searchParams.delete("lang");
            return context.redirect(url.pathname + url.search, 302);
        }
    }
    const cookieLang = cookies.get(LANG_COOKIE)?.value;
    locals.locale = isSupportedLocale(queryLang)
        ? queryLang
        : isSupportedLocale(cookieLang)
          ? cookieLang
          : DEFAULT_LOCALE;
    if (!isSupportedLocale(cookieLang) && !isSupportedLocale(queryLang)) {
        cookies.set(LANG_COOKIE, locals.locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    }

    const match = matchRoute(url.pathname);
    locals.route = match;

    const needsSession =
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/auth") ||
        url.pathname.startsWith("/_actions");
    if (needsSession) {
        try {
            locals.admin = await readSession(cookies);
        } catch (error) {
            console.error("[session] could not read session", error);
        }
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
        if (!locals.admin) {
            if (import.meta.env.DEV) console.warn(`[auth] ${url.pathname} needs a login: ${lastSessionMiss}`);
            return context.redirect("/auth/google", 302);
        }
    }

    // Localized URLs (/revista/articulo/x, /magazine/articulo/x, …) render the canonical page.
    const current = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    if (match && match.canonical !== current) {
        return next(match.canonical + url.search);
    }
    return next();
});
