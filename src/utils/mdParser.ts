import MarkdownIt, { Token, Renderer } from "markdown-it";
import markdownItLinkAttributes from "markdown-it-link-attributes";
import highlightjs from "markdown-it-highlightjs";
import blockEmbed from "markdown-it-block-embed";
import abbr from "markdown-it-abbr";
import footnote from "markdown-it-footnote";
import multimdTable from "markdown-it-multimd-table";
import texmath from "markdown-it-texmath";
import katex from "katex";
import container from "markdown-it-container";

import { __ } from "i18n";

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
        youtube: {
            width: "100%",
            height: "100%"
        },
        vimeo: {
            width: "100%",
            height: "100%"
        },
        vine: {
            width: "100%",
            height: "100%"
        },
        prezi: {
            width: "100%",
            height: "100%"
        }
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

/*
md.use(container, "spoiler", {
    validate: function (params: string) {
        return !!params.trim().match(/^spoiler\s+(.*)$/);
    },
    render: function (tokens: Token[], idx: number) {
        const m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);

        if (tokens[idx].nesting === 1) {
            return `<div class="not-prose hs-accordion-group" data-hs-accordion-always-open><div class="hs-accordion" id="hs-basic-always-open-heading-one"><button class="hs-accordion-toggle hs-accordion-active:text-blue-600 py-3 inline-flex items-center gap-x-3 w-full font-semibold text-left text-slate-800 dark:text-slate-200 transition hover:text-slate-700 dark:hs-accordion-active:text-blue-500 dark:hover:text-slate-300" aria-controls="hs-basic-always-open-collapse-one"><svg class="hs-accordion-active:hidden hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 block w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.62421 7.86L13.6242 7.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.12421 13.36V2.35999" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><svg class="hs-accordion-active:block hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 hidden w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.62421 7.86L13.6242 7.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${md.utils.escapeHtml(m![1])}</button><div id="hs-basic-always-open-collapse-one" class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" aria-labelledby="hs-basic-always-open-heading-one"><p class="text-slate-800 dark:text-slate-200">\n`;
        } else {
            return "</p></div></div></div>\n";
        }
    }
});
*/

md.renderer.rules.table_open = function (
    tokens: Token[],
    idx: number,
    options: any,
    env: any,
    self: Renderer
) {
    return '<div class="overflow-x-auto"><table>\n';
};
md.renderer.rules.table_close = function (
    tokens: Token[],
    idx: number,
    options: any,
    env: any,
    self: Renderer
) {
    return "</table></div>\n";
};

md.renderer.rules.image = (tokens: Token[], idx: number, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    const alt = token.content;
    if (alt)
        return `
        <div class="image-container flex flex-col items-center justify-center text-center w-full">
            <img style="margin-bottom:0px;" src="${src}" alt="${alt}">
            <div class="max-w-[75%] text-gray-400 dark:text-gray-500 text-center mx-auto">${parseMD(md.utils.escapeHtml(alt))}</div>
        </div>`; // class="max-w-fit"
    return `
        <img src="${src}">`;
};

md.use(container, "iquestion", {
    validate: function (params: string) {
        return !!params.trim().match(/^iquestion/);
    },
    render: function (tokens: Token[], idx: number) {
        if (tokens[idx].nesting === 1) {
            return `<div class="text-blue-700 dark:text-blue-200 text-xl italic flex -mt-[0.75em] -mb-[1.5em] space-x-2 font-semibold"><p>—</p>`;
        } else {
            return "<p class='opacity-0'>—</p></div>\n";
        }
    }
});

md.use(container, "container", {
    validate: function (params: string) {
        return !!params.trim().match(/^container\s+(.*)$/);
    },
    render: function (tokens: Token[], idx: number) {
        if (tokens[idx].nesting === 1) {
            const m = tokens[idx].info.trim().match(/^container\s+(.*)$/);

            return `<div class="rounded-xl p-4 w-full mx-auto flex flex-col items-center text-center border-2 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700">
                        <div class="flex space-x-2 items-center not-prose">
                            <svg class="h-4 w-4 text-black dark:text-white mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                <rect x="1.5" y="1.5" width="13" height="13" rx="3" ry="3" stroke="currentColor" fill="none" stroke-width="3" />
                            </svg>
                            <h3 class="text-xl text-black dark:text-white font-semibold">${__("containers." + m![1] + ".title")}</h3>
                        </div>
                `;
        } else {
            return "</div>\n";
        }
    }
});

md.use(container, "solution", {
    validate: function (params: string) {
        return !!params.trim().match(/^solution\s+(.*)$/);
    },
    render: function (tokens: Token[], idx: number) {
        if (tokens[idx].nesting === 1) {
            const m = tokens[idx].info.trim().match(/^solution\s+(.*)$/);

            return `<div class="rounded-xl p-4 w-full mx-auto flex flex-col items-center text-center border-2 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-700">
                        <div class="flex space-x-2 items-center not-prose">
                            <svg class="h-4 w-4 text-black dark:text-white mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                <rect x="1.5" y="1.5" width="13" height="13" rx="3" ry="3" stroke="currentColor" fill="none" stroke-width="3" />
                            </svg>
                            <h3 class="text-xl text-black dark:text-white font-semibold">${__("containers.solution." + m![1] + ".title")}</h3>
                        </div>
                        <br>
                        <div class="relative w-full h-full">
                        <div class="spoiler-overlay">${__("containers.solution." + m![1] + ".click")}</div>
                `;
        } else {
            return "</div></div>\n";
        }
    }
});

md.use(container, "js", {
    validate: function (params: string) {
        return params.trim().match(/^js\s+(\S+)\s*$/);
    },

    render: function (tokens: Token[], idx: number) {
        const m = tokens[idx].info.trim().match(/^js\s+(\S+)\s*$/);

        if (tokens[idx].nesting === 1 && m && m.length > 1) {
            const scriptName = m[1];
            const content = tokens[idx + 2].content.trim().split("\n");
            const paramsString = content[0];
            const instanceName = content[1];
            const optionsString = content[2];

            return `
            <div class="max-w-[48rem] w-full mx-auto">
                <div class="interactive-placeholder" data-script="${scriptName}" data-params='${paramsString}' data-instance-name="${instanceName}" data-options='${optionsString}'>
                    <div id="interactive-container-${instanceName}" class="relative w-full h-64 border-2 border-b-0 border-gray-300 dark:border-gray-500 rounded-t-xl overflow-hidden">
                        <div id="overlay-${instanceName}" class="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600 z-20">
                            <svg id="play-button-${instanceName}" class="play-button text-black dark:text-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 330" stroke="currentColor" fill="currentColor"><path d="M37.728,328.12c2.266,1.256,4.77,1.88,7.272,1.88c2.763,0,5.522-0.763,7.95-2.28l240-149.999 c4.386-2.741,7.05-7.548,7.05-12.72c0-5.172-2.664-9.979-7.05-12.72L52.95,2.28c-4.625-2.891-10.453-3.043-15.222-0.4 C32.959,4.524,30,9.547,30,15v300C30,320.453,32.959,325.476,37.728,328.12z"/></svg>    
                            <svg id="loading-animation-${instanceName}" class="loading-animation hidden text-black dark:text-white w-8 h-8" width="24" height="24" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style><g class="spinner_V8m1"><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle></g></svg>
                        </div>
                    </div>
                </div>
                <div id="controls-arrow-${instanceName}" class="items-center flex -mt-[0.65rem] -mb-[13px]">
                    <div class="w-full h-0.5 bg-gray-300 dark:bg-gray-500"></div>
                    <div class="rounded-full p-0.5 border-2 border-gray-300 dark:border-gray-500 h-min cursor-pointer z-50 bg-gray-100 dark:bg-gray-700" onclick="toggleControls('${instanceName}')">
                        <svg id="arrow-${instanceName}" class="w-4 h-4 text-gray-300 dark:border-gray-500 transform transition-transform pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    <div class="w-full h-0.5 bg-gray-300 dark:bg-gray-500"></div>
                </div>
                <div id="controls-${instanceName}" class="controls flex h-0 overflow-hidden transform transition-all bg-gray-100 dark:bg-gray-700 -mt-3 px-2 py-0 rounded-b-xl border-2 border-y-0 border-gray-300 dark:border-gray-500"></div>
            </div>
            <div class="hidden"> // Container raw content
            `;
        } else {
            return "</div>";
        }
    }
});

function preprocessMarkdown(markdown: string): string {
    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|((https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/\S+)/g,
        (match: string, mdLink: string, ytUrl: string) => {
            if (mdLink) {
                return match;
            } else if (ytUrl) {
                return "\n\n@[youtube](" + ytUrl + ")";
            }
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/(www\.|player\.)?vimeo\.com\/\S+/g,
        (match: string, mdLink: string, vimeoUrl: string) => {
            if (mdLink) {
                return match;
            } else if (vimeoUrl) {
                return "\n\n@[vimeo](" + match + ")";
            }
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/vine\.co\/v\/\S+\/embed\/\S+/g,
        (match: string, mdLink: string, vineUrl: string) => {
            if (mdLink) {
                return match;
            } else if (vineUrl) {
                return "\n\n@[vine](" + match + ")";
            }
            return match;
        }
    );

    markdown = markdown.replace(
        /(\[[^\]]+\]\([^)]+\)|\(\b)|https?:\/\/prezi\.com\/\S+/g,
        (match: string, mdLink: string, preziUrl: string) => {
            if (mdLink) {
                return match;
            } else if (preziUrl) {
                return "\n\n@[prezi](" + match + ")";
            }
            return match;
        }
    );

    return markdown;
}

function postprocessHTML(html: string): string {
    html = html.replace(
        /(<div class="flex justify-center block-embed-service-[^"]+">.*?<\/div>)/g,
        '<div class="flex justify-center"><div class="w-full aspect-video relative max-w-[45rem]">$1</div></div>'
    );
    return html;
}

function parseMD(markdown: string): string {
    return postprocessHTML(md.render(preprocessMarkdown(markdown)));
}

function escapeHTML(txt: string): string {
    return txt
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export { parseMD, escapeHTML };
