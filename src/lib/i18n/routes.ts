import { allTranslations, t } from "./index";

// Localized URLs. Every page lives under a canonical path (the file-system route), and
// requests using any translation of each segment, in any combination, are rewritten to it.
// This mirrors the old `getRouteTranslations` behavior: `/revista/articulo/x`,
// `/magazine/article/x` and `/revista/article/x` all reach the same page.

type Segment = { key: string; canonical: string } | { param: string } | { literal: string };

const key = (translationKey: string, canonical: string): Segment => ({
    key: translationKey,
    canonical
});
const param = (name: string): Segment => ({ param: name });
const literal = (value: string): Segment => ({ literal: value });

const MAGAZINE = key("magazine.index.url", "magazine");
const ARTICLE = key("magazine.post.url", "article");
const ACTIVITIES = key("activities.index.url", "activities");
const ADMIN = literal("admin");

export const ROUTES = {
    home: [],
    magazine: [MAGAZINE],
    issue: [MAGAZINE, param("issue")],
    article: [MAGAZINE, ARTICLE, param("url")],
    articleViews: [MAGAZINE, ARTICLE, param("url"), literal("increment-views")],
    activities: [ACTIVITIES],
    activity: [ACTIVITIES, param("url")],
    profile: [key("profile.url", "profile"), param("url")],
    contact: [key("contact.url", "contact")],
    about: [key("about.url", "about")],
    emailSuccessful: [key("email-successful.url", "email-successful")],
    admin: [ADMIN],
    adminAccounts: [ADMIN, key("admin.accounts.url", "accounts")],
    adminProfiles: [ADMIN, key("admin.profiles.url", "profiles")],
    adminProfile: [ADMIN, key("admin.profiles.url", "profiles"), param("url")],
    adminMagazines: [ADMIN, key("admin.magazines.url", "magazines")],
    adminMagazine: [ADMIN, key("admin.magazines.url", "magazines"), param("url")],
    adminPosts: [ADMIN, key("admin.posts.url", "articles")],
    adminPost: [ADMIN, key("admin.posts.url", "articles"), param("url")],
    adminActivities: [ADMIN, key("admin.activities.url", "activities")],
    adminActivity: [ADMIN, key("admin.activities.url", "activities"), param("url")],
    adminNews: [ADMIN, key("admin.news.url", "news")]
} satisfies Record<string, Segment[]>;

export type RouteName = keyof typeof ROUTES;

function encode(value: string): string {
    return encodeURIComponent(value);
}

/** Builds the localized path for `route`, e.g. href("es", "article", { url: "x" }) → /revista/articulo/x */
export function href(locale: string, route: RouteName, params: Record<string, string> = {}): string {
    const parts = (ROUTES[route] as Segment[]).map((segment) => {
        if ("key" in segment) return t(locale, segment.key);
        if ("param" in segment) return encode(params[segment.param] ?? "");
        return segment.literal;
    });
    return "/" + parts.join("/");
}

/** Canonical (file-system) path for `route`. */
export function canonicalPath(route: RouteName, params: Record<string, string> = {}): string {
    const parts = (ROUTES[route] as Segment[]).map((segment) => {
        if ("key" in segment) return segment.canonical;
        if ("param" in segment) return encode(params[segment.param] ?? "");
        return segment.literal;
    });
    return "/" + parts.join("/");
}

export interface RouteMatch {
    route: RouteName;
    params: Record<string, string>;
    canonical: string;
}

/** Matches a request pathname against every localized form of every route. */
export function matchRoute(pathname: string): RouteMatch | undefined {
    const segments = pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        });

    for (const [route, pattern] of Object.entries(ROUTES) as [RouteName, Segment[]][]) {
        if (pattern.length !== segments.length) continue;
        const params: Record<string, string> = {};
        const ok = pattern.every((segment, index) => {
            const value = segments[index];
            if ("literal" in segment) return value === segment.literal;
            if ("param" in segment) {
                params[segment.param] = value;
                return true;
            }
            return value === segment.canonical || allTranslations(segment.key).includes(value);
        });
        if (ok) return { route, params, canonical: canonicalPath(route, params) };
    }
    return undefined;
}

/** Returns the same page in another language (used for hreflang alternates). */
export function localizedPathname(pathname: string, locale: string): string {
    const match = matchRoute(pathname);
    return match ? href(locale, match.route, match.params) : pathname;
}
