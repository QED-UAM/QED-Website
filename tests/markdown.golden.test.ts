// Renders every real article (tests/fixtures/content.json, created by
// `npm run snapshot:content`) with the legacy parser and the new one and requires identical
// HTML once the intentional, documented differences are normalized away.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMD as legacyParse } from "./legacy/mdParser";
import { parseMD } from "../src/lib/markdown";

const fixture = "tests/fixtures/content.json";
const entries: { id: string; markdown: string }[] = fs.existsSync(fixture)
    ? JSON.parse(fs.readFileSync(fixture, "utf8"))
    : [];

function unescapeAttribute(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}

/** Removes the intentional v2 additions so only unexpected differences remain. */
function normalize(html: string): string {
    return html
        .replace(/ loading="lazy"/g, "")
        .replace(/ role="button" tabindex="0" aria-label="Play"/g, "")
        .replace(/\binteractive-(slate|frame|overlay|arrow-button|arrow|controls) /g, "")
        .replace(/ class="controls interactive-controls /g, ' class="controls ')
        .replace(
            /data-(params|options|script|instance-name)=(['"])(.*?)\2/g,
            (_match, name: string, quote: string, value: string) =>
                `data-${name}=${quote}${unescapeAttribute(value)}${quote}`
        );
}

const trimLines = (html: string) => html.replace(/[ \t]+$/gm, "");

/** Class lists are compared blank: v2 restyles boxes, captions and the interactive slate. */
const blankClasses = (html: string) => html.replace(/class=(["'])[^"']*\1/g, 'class=""');

describe.skipIf(entries.length === 0)("markdown output parity with the legacy parser", () => {
    it.each(entries.map((entry) => [entry.id, entry.markdown]))("%s", (_id, markdown) => {
        expect(blankClasses(trimLines(normalize(parseMD(markdown, { locale: "es" }))))).toBe(
            blankClasses(trimLines(legacyParse(markdown)))
        );
    });
});
