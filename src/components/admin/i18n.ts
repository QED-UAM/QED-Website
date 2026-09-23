// Client-side lookup over the catalog sections an admin page passes to its island.
export type Strings = { [key: string]: string | Strings };

export function translator(strings: Strings) {
    return (key: string, vars: Record<string, string | number> = {}): string => {
        let node: string | Strings | undefined = strings;
        for (const part of key.split(".")) {
            if (node === undefined || typeof node === "string") return key;
            node = node[part];
        }
        if (typeof node !== "string") return key;
        return node.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, name: string) =>
            name in vars ? String(vars[name]) : match
        );
    };
}

export type Translate = ReturnType<typeof translator>;
