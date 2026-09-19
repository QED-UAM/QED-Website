import type { LocalizedText } from "../db/models";
import { catalogSections, supportedLocales } from "../i18n";

/** Data every admin island needs: enabled languages and the translated UI strings. */
export function adminContext(locale: string) {
    return {
        languages: supportedLocales(),
        strings: catalogSections(locale, ["admin", "roles", "postTypes"])
    };
}

/** Editor state for a multilingual field: every enabled language present, LF line endings. */
export function editable(value: LocalizedText | undefined | null): Record<string, string> {
    const result: Record<string, string> = {};
    for (const lang of supportedLocales()) result[lang] = (value?.[lang] ?? "").replace(/\r\n/g, "\n");
    return result;
}

export const lf = (value: string | undefined | null) => (value ?? "").replace(/\r\n/g, "\n");
