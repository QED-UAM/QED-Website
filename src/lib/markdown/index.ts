import MarkdownIt from "markdown-it";
import type { Token, Renderer, Options } from "markdown-it";
import markdownItLinkAttributes from "markdown-it-link-attributes";
import highlightjs from "markdown-it-highlightjs";
import blockEmbed from "markdown-it-block-embed";
import abbr from "markdown-it-abbr";
import footnote from "markdown-it-footnote";
import multimdTable from "markdown-it-multimd-table";
import texmath from "markdown-it-texmath";
import container from "markdown-it-container";
import katex from "katex";
import { hasKey, t } from "../i18n";
import { DEFAULT_LOCALE } from "../config";

// Port of the legacy src/utils/mdParser.ts. The plugin chain and renderer overrides are
// kept identical so the 50+ published articles render the same HTML (verified by the golden
// test in tests/markdown.golden.test.ts). Differences from the legacy output:
//  - container titles resolve with the render locale when the key has no ".es"/".en" suffix
//  - data attributes of interactive placeholders are HTML-escaped
//  - images are lazy-loaded
//  - the boxes, captions and interactive slate use the v2 palette (grid/surface/ink/muted)

interface RenderEnv {
    locale: string;
}

type RuleArgs = [tokens: Token[], idx: number, options: Options, env: RenderEnv, self: Renderer];

const md: MarkdownIt = new MarkdownIt({
    linkify: true,
    breaks: true,
    html: true,
    typographer: true
})
    .use(markdownItLinkAttributes, {
        pattern: /^https?:\/\//,
        attrs: {
            target: "_blank",
            rel: "noopener noreferrer"
        }
    })
    .use(highlightjs)
    .use(blockEmbed, {
        containerClassName: "flex justify-center",
        youtube: { width: "100%", height: "100%" },
        vimeo: { width: "100%", height: "100%" },
        vine: { width: "100%", height: "100%" },
        prezi: { width: "100%", height: "100%" }
    })
    .use(footnote)
    .use(abbr)
    .use(multimdTable, {
        multiline: true,
        rowspan: true,
        headerless: true,
        multibody: true,
        aotolabel: true
    })
    .use(texmath, {
        engine: katex,
        delimiters: "dollars",
        katexOptions: {
            strict: "ignore"
        }
    });

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

/**
 * Title of a `::: container name` block. Legacy content names the language explicitly
 * (`didyouknow.es` → containers.didyouknow.es.title); names without it use the render locale.
 */
function containerText(locale: string, name: string, field: string): string {
    const explicit = `containers.${name}.${field}`;
    if (hasKey(explicit)) return t(locale, explicit);
    return t(locale, `containers.${name}.${locale}.${field}`);
}

md.renderer.rules.table_open = () => '<div class="overflow-x-auto"><table>\n';
md.renderer.rules.table_close = () => "</table></div>\n";

md.renderer.rules.image = (...[tokens, idx, , env]: RuleArgs) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    const alt = token.content;
    if (alt)
        return `
        <div class="image-container flex flex-col items-center justify-center text-center w-full">
            <img style="margin-bottom:0px;" src="${src}" alt="${alt}" loading="lazy">
            <div class="image-caption max-w-[75%] text-muted text-center mx-auto">${parseMD(md.utils.escapeHtml(alt), env)}</div>
        </div>`;
    return `
        <img src="${src}" loading="lazy">`;
};

md.use(container, "iquestion", {
    validate: (params: string) => !!params.trim().match(/^iquestion/),
    render: (...[tokens, idx]: RuleArgs) => {
        if (tokens[idx].nesting === 1) {
            return `<div class="iquestion text-ink text-xl italic flex -mt-[0.75em] -mb-[1.5em] space-x-2 font-semibold"><p>—</p>`;
        }
        return "<p class='opacity-0'>—</p></div>\n";
    }
});

md.use(container, "container", {
    validate: (params: string) => !!params.trim().match(/^container\s+(.*)$/),
    render: (...[tokens, idx, , env]: RuleArgs) => {
        if (tokens[idx].nesting === 1) {
            const m = tokens[idx].info.trim().match(/^container\s+(.*)$/)!;
            return `<div class="md-box rounded-xl p-4 w-full mx-auto flex flex-col items-center text-center border-2 border-grid bg-surface">
                        <div class="flex space-x-2 items-center not-prose">
                            <svg class="h-4 w-4 text-ink mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                <rect x="1.5" y="1.5" width="13" height="13" rx="3" ry="3" stroke="currentColor" fill="none" stroke-width="3" />
                            </svg>
                            <h3 class="text-xl text-graphite font-semibold">${containerText(env.locale, m[1], "title")}</h3>
                        </div>
                `;
        }
        return "</div>\n";
    }
});

md.use(container, "solution", {
    validate: (params: string) => !!params.trim().match(/^solution\s+(.*)$/),
    render: (...[tokens, idx, , env]: RuleArgs) => {
        if (tokens[idx].nesting === 1) {
            const m = tokens[idx].info.trim().match(/^solution\s+(.*)$/)!;
            const lang = m[1];
            return `<div class="md-box rounded-xl p-4 w-full mx-auto flex flex-col items-center text-center border-2 border-grid bg-surface">
                        <div class="flex space-x-2 items-center not-prose">
                            <svg class="h-4 w-4 text-ink mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                <rect x="1.5" y="1.5" width="13" height="13" rx="3" ry="3" stroke="currentColor" fill="none" stroke-width="3" />
                            </svg>
                            <h3 class="text-xl text-graphite font-semibold">${t(env.locale, `containers.solution.${lang}.title`)}</h3>
                        </div>
                        <br>
                        <div class="relative w-full h-full">
                        <div class="spoiler-overlay">${t(env.locale, `containers.solution.${lang}.click`)}</div>
                `;
        }
        return "</div></div>\n";
    }
});

// Interactive components. The markup (ids, classes and data attributes) is a contract with
// public/js/postInteractiveElements.js; see docs/interactive-components.md before changing it.
md.use(container, "js", {
    validate: (params: string) => !!params.trim().match(/^js\s+(\S+)\s*$/),
    render: (...[tokens, idx]: RuleArgs) => {
        const m = tokens[idx].info.trim().match(/^js\s+(\S+)\s*$/);

        if (tokens[idx].nesting === 1 && m && m.length > 1) {
            const scriptName = escapeAttribute(m[1]);
            const content = tokens[idx + 2].content.trim().split("\n");
            const paramsString = escapeAttribute(content[0] ?? "");
            const instanceName = escapeAttribute(content[1] ?? "");
            const optionsString = escapeAttribute(content[2] ?? "");

            return `
            <div class="interactive-slate max-w-[48rem] w-full mx-auto">
                <div class="interactive-placeholder" data-script="${scriptName}" data-params='${paramsString}' data-instance-name="${instanceName}" data-options='${optionsString}'>
                    <div id="interactive-container-${instanceName}" class="interactive-frame relative w-full h-64 border-2 border-b-0 border-grid rounded-t-xl overflow-hidden">
                        <div id="overlay-${instanceName}" class="interactive-overlay absolute inset-0 flex items-center justify-center bg-paper z-20">
                            <svg id="play-button-${instanceName}" class="play-button text-ink w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 330" stroke="currentColor" fill="currentColor" role="button" tabindex="0" aria-label="Play"><path d="M37.728,328.12c2.266,1.256,4.77,1.88,7.272,1.88c2.763,0,5.522-0.763,7.95-2.28l240-149.999 c4.386-2.741,7.05-7.548,7.05-12.72c0-5.172-2.664-9.979-7.05-12.72L52.95,2.28c-4.625-2.891-10.453-3.043-15.222-0.4 C32.959,4.524,30,9.547,30,15v300C30,320.453,32.959,325.476,37.728,328.12z"/></svg>
                            <svg id="loading-animation-${instanceName}" class="loading-animation hidden text-ink w-8 h-8" width="24" height="24" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle></g></svg>
                        </div>
                    </div>
                </div>
                <div id="controls-arrow-${instanceName}" class="interactive-arrow items-center flex -mt-[0.65rem] -mb-[13px]">
                    <div class="w-full h-0.5 bg-grid"></div>
                    <div class="interactive-arrow-button rounded-full p-0.5 border-2 border-grid h-min cursor-pointer z-50 bg-surface" onclick="toggleControls('${instanceName}')">
                        <svg id="arrow-${instanceName}" class="w-4 h-4 text-muted transform transition-transform pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    <div class="w-full h-0.5 bg-grid"></div>
                </div>
                <div id="controls-${instanceName}" class="controls interactive-controls flex h-0 overflow-hidden transform transition-all bg-surface -mt-3 px-2 py-0 rounded-b-xl border-2 border-y-0 border-grid"></div>
            </div>
            <div class="hidden"> // Container raw content
            `;
        }
        return "</div>";
    }
});

function preprocessMarkdown(markdown: string): string {
    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|((https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/\S+)/g,
        (match: string, mdLink: string, ytUrl: string) => {
            if (mdLink) return match;
            if (ytUrl) return "\n\n@[youtube](" + ytUrl + ")";
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/(www\.|player\.)?vimeo\.com\/\S+/g,
        (match: string, mdLink: string, vimeoUrl: string) => {
            if (mdLink) return match;
            if (vimeoUrl) return "\n\n@[vimeo](" + match + ")";
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/vine\.co\/v\/\S+\/embed\/\S+/g,
        (match: string, mdLink: string, vineUrl: string) => {
            if (mdLink) return match;
            if (vineUrl) return "\n\n@[vine](" + match + ")";
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/prezi\.com\/\S+/g,
        (match: string, mdLink: string, preziUrl: string) => {
            if (mdLink) return match;
            if (preziUrl) return "\n\n@[prezi](" + match + ")";
            return match;
        }
    );

    return markdown;
}

function postprocessHTML(html: string): string {
    return html.replace(
        /(<div class="flex justify-center block-embed-service-[^"]+">.*?<\/div>)/g,
        '<div class="flex justify-center"><div class="w-full aspect-video relative max-w-[45rem]">$1</div></div>'
    );
}

/** Renders article markdown to HTML. `locale` only affects container titles without a language suffix. */
export function parseMD(markdown: string, options: Partial<RenderEnv> = {}): string {
    const env: RenderEnv = { locale: options.locale ?? DEFAULT_LOCALE };
    return postprocessHTML(md.render(preprocessMarkdown(markdown ?? ""), env));
}

export function escapeHTML(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
