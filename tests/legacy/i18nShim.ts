// Stand-in for the i18n-node global `__` used by the legacy parser (its locale was always "es").
import es from "../../locales/es.json";

export function __(key: string): string {
    let node: unknown = es;
    for (const part of key.split(".")) {
        if (!node || typeof node !== "object") return key;
        node = (node as Record<string, unknown>)[part];
    }
    return typeof node === "string" ? node : key;
}
