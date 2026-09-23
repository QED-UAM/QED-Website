import type { LocalizedText } from "./db/models";
import { DEFAULT_LOCALE } from "./config";

const TIME_ZONE = "Europe/Madrid";

export interface Localized {
    value: string;
    /** True when the text doesn't exist in the requested language (shown with a red-pen mark). */
    missing: boolean;
}

/**
 * Picks the `lang` version of a multilingual field, falling back to Spanish.
 * Same semantics as the old `$ifNull: [field.<lang>, field.es]` pipelines.
 */
export function localize(map: LocalizedText | undefined | null, lang: string): Localized {
    const own = map?.[lang];
    if (own !== undefined && own !== null) return { value: own, missing: false };
    return { value: map?.[DEFAULT_LOCALE] ?? "", missing: true };
}

/** 05/03/2025 */
export function shortDate(date: Date): string {
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: TIME_ZONE
    }).format(date);
}

/** "5 de marzo de 2025" / "March 5, 2025" */
export function longDate(date: Date, lang: string): string {
    return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: TIME_ZONE
    }).format(date);
}

/** Academic year for a date: September starts a new one, e.g. "2025-26". */
export function schoolYear(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "numeric",
        timeZone: TIME_ZONE
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")!.value);
    const month = Number(parts.find((part) => part.type === "month")!.value);
    const start = month >= 9 ? year : year - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
}

export const MAIN_BOARD_ROLES = ["president", "vicepresident", "treasurer", "secretary"] as const;

/** Translation key for a directive-board role ("Presidente de QED" vs "Vocal"). */
export function boardRoleKey(role: string, long = true): string {
    return long && (MAIN_BOARD_ROLES as readonly string[]).includes(role)
        ? `profile.role.${role}`
        : `admin.directiveBoard.roles.${role}`;
}
