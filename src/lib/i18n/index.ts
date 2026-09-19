import es from "../../../locales/es.json";
import en from "../../../locales/en.json";
import { config, DEFAULT_LOCALE } from "../config";

type Catalog = { [key: string]: string | Catalog };

const catalogs: Record<string, Catalog> = { es, en } as Record<string, Catalog>;

/** Languages that have a catalog and are enabled through SUPPORTED_LANGUAGES. */
export function supportedLocales(): string[] {
    const enabled = config.supportedLanguages.filter((lang) => lang in catalogs);
    return enabled.length > 0 ? enabled : [DEFAULT_LOCALE];
}

export function isSupportedLocale(value: unknown): value is string {
    return typeof value === "string" && supportedLocales().includes(value);
}

function lookup(catalog: Catalog | undefined, key: string): string | Catalog | undefined {
    let node: string | Catalog | undefined = catalog;
    for (const part of key.split(".")) {
        if (node === undefined || typeof node === "string") return undefined;
        node = node[part];
    }
    return node;
}

function resolve(locale: string, key: string): string | Catalog | undefined {
    return lookup(catalogs[locale], key) ?? lookup(catalogs[DEFAULT_LOCALE], key);
}

/**
 * Translates `key` (dot notation) for `locale`, falling back to Spanish and then to the
 * key itself. `{{name}}` placeholders are replaced with `vars`. Values are never parsed
 * as keys, so titles containing ":" or "." render untouched.
 */
export function t(locale: string, key: string, vars: Record<string, string | number> = {}): string {
    const value = resolve(locale, key);
    if (typeof value !== "string") return key;
    return value.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
    );
}

/** Returns a flat `{ key: label }` map for a catalog section such as `tags` or `roles`. */
export function tMap(locale: string, key: string): Record<string, string> {
    const value = resolve(locale, key);
    if (!value || typeof value === "string") return {};
    const result: Record<string, string> = {};
    for (const [name, label] of Object.entries(value)) {
        if (typeof label === "string") result[name] = label;
    }
    return result;
}

/** Whether `key` exists in the default catalog (used to validate enum-like values). */
export function hasKey(key: string): boolean {
    return lookup(catalogs[DEFAULT_LOCALE], key) !== undefined;
}

/** All translations of `key` across the enabled locales (used for localized URL segments). */
export function allTranslations(key: string): string[] {
    const values = new Set<string>();
    for (const locale of Object.keys(catalogs)) {
        const value = lookup(catalogs[locale], key);
        if (typeof value === "string") values.add(value);
    }
    return [...values];
}

/** Human-readable language name, e.g. "Español" or "Inglés (English)". */
export function languageName(locale: string, language: string): string {
    const capitalize = (text: string | undefined) =>
        text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : language;
    const inCurrent = capitalize(new Intl.DisplayNames([locale], { type: "language" }).of(language));
    if (language === locale) return inCurrent;
    const native = capitalize(new Intl.DisplayNames([language], { type: "language" }).of(language));
    return `${inCurrent} (${native})`;
}

type Tree = { [key: string]: string | Tree };

function mergeTrees(base: Tree, override: Tree): Tree {
    const result: Tree = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const current = result[key];
        result[key] =
            typeof value === "object" && typeof current === "object" ? mergeTrees(current, value) : value;
    }
    return result;
}

/** Catalog sections for client-side components (Spanish values fill missing translations). */
export function catalogSections(locale: string, keys: string[]): Tree {
    const result: Tree = {};
    for (const key of keys) {
        const fallback = lookup(catalogs[DEFAULT_LOCALE], key);
        const own = lookup(catalogs[locale], key);
        if (typeof fallback === "object" || typeof own === "object") {
            result[key] = mergeTrees(
                typeof fallback === "object" ? fallback : {},
                typeof own === "object" ? own : {}
            );
        }
    }
    return result;
}
