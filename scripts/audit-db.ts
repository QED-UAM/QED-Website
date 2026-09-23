// Read-only audit of the content stored in MongoDB. Reports what the rewrite must stay
// compatible with: interactive options, containers, globals referenced by article scripts,
// inline <script> tags, external libraries and Tailwind v3-only utilities.
//
//   MONGODB_URI=mongodb://127.0.0.1:27017/qed npm run audit:db
import mongoose from "mongoose";
import { config } from "../src/lib/config";

const RUNTIME_GLOBALS = [
    "ielightbgrgb",
    "ielightbgclass",
    "ielightmainrgb",
    "ielightmainclass",
    "ielightcontrastrgb",
    "ielightcontrastclass",
    "iedarkbgrgb",
    "iedarkbgclass",
    "iedarkmainrgb",
    "iedarkmainclass",
    "iedarkcontrastrgb",
    "iedarkcontrastclass",
    "toggleControls",
    "activateInteractiveElements",
    "removeEmptyPTags",
    "interactiveElements",
    "current-lang-icon",
    "on-theme-change",
    "scrollbar-style",
    "katex",
    "THREE",
    "texmath",
    "hljs"
];

const V3_ONLY = [
    /\bflex-(shrink|grow)(-\d+)?\b/,
    /\b(bg|text|border|divide|ring|placeholder)-opacity-\d+\b/,
    /\boverflow-ellipsis\b/,
    /\bdecoration-(slice|clone)\b/,
    /\bshadow-sm\b/,
    /\brounded-sm\b/,
    /\bblur-sm\b/,
    /\boutline-none\b/,
    /\bring\b(?!-)/
];

type Doc = Record<string, unknown>;

function strings(value: unknown): string[] {
    if (typeof value === "string") return [value];
    if (value && typeof value === "object") return Object.values(value).flatMap(strings);
    return [];
}

async function main() {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db!;
    console.log(`Database: ${db.databaseName}`);

    const collections = await db.listCollections().toArray();
    for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
        console.log(`  ${name}: ${await db.collection(name).countDocuments()} documents`);
    }

    const options = new Map<string, number>();
    const scriptNames = new Map<string, number>();
    const containers = new Map<string, number>();
    const globals = new Map<string, number>();
    const v3 = new Map<string, number>();
    const externals = new Set<string>();
    const inlineScripts: string[] = [];
    const colonTitles: string[] = [];
    const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

    for (const name of ["posts", "activities", "news", "magazines", "users"]) {
        const docs = (await db.collection(name).find().toArray()) as Doc[];
        for (const doc of docs) {
            const markdown = [doc.content, doc.description, doc.about].flatMap(strings);
            const scripts = strings(doc.scripts);
            const all = [...markdown, ...scripts];
            const label = `${name}/${String(doc.url)}`;

            for (const title of strings(doc.title))
                if (/[:.]/.test(title)) colonTitles.push(`${label}: ${title}`);

            for (const text of markdown) {
                for (const match of text.matchAll(/^\s*:::\s*(\w+)(?:\s+(\S+))?\s*$/gm)) {
                    bump(containers, match[2] ? `${match[1]} ${match[2]}` : match[1]);
                }
                for (const match of text.matchAll(/^\s*:::\s*js\s+(\S+)\s*\n([^\n]*)\n([^\n]*)\n([^\n]*)/gm)) {
                    bump(scriptNames, match[1]);
                    for (const option of match[4].split(",").map((o) => o.trim()).filter(Boolean)) {
                        bump(options, option.startsWith("h=") ? `h=${option.slice(2)}` : option);
                    }
                }
                if (/<script\b/i.test(text)) inlineScripts.push(label);
            }

            for (const text of all) {
                for (const global of RUNTIME_GLOBALS) if (text.includes(global)) bump(globals, global);
                for (const pattern of V3_ONLY) {
                    for (const match of text.matchAll(new RegExp(pattern, "g"))) bump(v3, match[0]);
                }
                for (const match of text.matchAll(/(?:import\s*\(|from\s+|src\s*=\s*)["'`](https?:\/\/[^"'`]+)/g)) {
                    externals.add(match[1]);
                }
                for (const match of text.matchAll(/["'`](\/objects\/[^"'`]+)["'`]/g)) externals.add(match[1]);
            }
        }
    }

    const print = (title: string, map: Map<string, number>) => {
        console.log(`\n${title}`);
        for (const [key, count] of [...map].sort((a, b) => b[1] - a[1])) console.log(`  ${key}: ${count}`);
    };
    print("Interactive components (::: js <Class>)", scriptNames);
    print("Interactive options", options);
    print("Containers", containers);
    print("Runtime globals referenced", globals);
    print("Tailwind v3-only / renamed utilities", v3);
    console.log("\nExternal resources loaded by content/scripts");
    for (const url of [...externals].sort()) console.log(`  ${url}`);
    console.log(`\nInline <script> in markdown: ${inlineScripts.join(", ") || "none"}`);
    console.log(`\nTitles containing ':' or '.':`);
    for (const title of colonTitles) console.log(`  ${title}`);

    await mongoose.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
