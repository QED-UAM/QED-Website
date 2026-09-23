import type { AstroGlobal } from "astro";
import { t } from "./i18n";
import { href, type RouteName } from "./i18n/routes";
import { siteOrigin } from "./auth/google";

/** Per-request helpers for pages and components: translations and localized links. */
export function usePage(Astro: Pick<AstroGlobal, "locals" | "url" | "params">) {
    const locale = Astro.locals.locale;
    return {
        locale,
        t: (key: string, vars?: Record<string, string | number>) => t(locale, key, vars),
        href: (route: RouteName, params?: Record<string, string>) => href(locale, route, params),
        /** Route parameter; localized URLs are rewritten, so read the middleware's match first. */
        param: (name: string) => Astro.locals.route?.params[name] ?? Astro.params[name] ?? "",
        origin: siteOrigin(Astro.url)
    };
}
