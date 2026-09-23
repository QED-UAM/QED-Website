// Dumps every markdown field (read-only) to tests/fixtures/content.json so the markdown
// golden test can compare the legacy parser with the new one over real articles.
// The fixture is gitignored: it contains unpublished drafts and profile data.
//
//   MONGODB_URI=mongodb://127.0.0.1:27017/qed npm run snapshot:content
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "../src/lib/config";

interface Entry {
    id: string;
    markdown: string;
}

async function main() {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db!;
    const entries: Entry[] = [];
    const fields: Record<string, string[]> = {
        posts: ["content", "description"],
        activities: ["content", "description"],
        news: ["description"],
        magazines: ["description"],
        users: ["about"]
    };

    for (const [collection, names] of Object.entries(fields)) {
        for (const doc of await db.collection(collection).find().toArray()) {
            for (const field of names) {
                for (const [lang, markdown] of Object.entries(doc[field] ?? {})) {
                    if (typeof markdown === "string" && markdown.trim()) {
                        entries.push({ id: `${collection}/${doc.url}/${field}/${lang}`, markdown });
                    }
                }
            }
        }
    }

    const file = path.resolve("tests/fixtures/content.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(entries, null, 2));
    console.log(`Wrote ${entries.length} markdown fields to ${file}`);
    await mongoose.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
