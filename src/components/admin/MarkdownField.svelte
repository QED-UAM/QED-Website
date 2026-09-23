<script lang="ts">
    import { actions } from "astro:actions";
    import LanguageTabs from "./LanguageTabs.svelte";
    import { bindPlayKeys, bindSpoilers } from "../../scripts/content";

    // Multilingual markdown with a live preview of the active language. When `scripts` is set,
    // interactive components in the preview are started with them, as on the public page.
    interface Props {
        label: string;
        languages: string[];
        value: Record<string, string>;
        id: string;
        scripts?: string;
        rows?: number;
        previewClass?: string;
        previewLabel: string;
    }

    let {
        label,
        languages,
        value = $bindable(),
        id,
        scripts,
        rows = 14,
        previewClass = "prose prose-custom dark:prose-invert max-w-none",
        previewLabel
    }: Props = $props();

    let active = $state(languages[0]);
    let preview: HTMLDivElement | undefined = $state();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request = 0;
    const filled = $derived(Object.fromEntries(languages.map((lang) => [lang, Boolean(value[lang]?.trim())])));

    async function render(markdown: string, locale: string, code: string | undefined) {
        const current = ++request;
        // The preview element is owned by this code and the legacy runtime, never by Svelte
        // (it renders empty), so writing its HTML directly is safe.
        if (!markdown.trim()) {
            // eslint-disable-next-line svelte/no-dom-manipulating
            if (preview) preview.innerHTML = "";
            return;
        }
        const { data, error } = await actions.markdown.preview({ md: markdown, locale });
        if (current !== request || !preview || error) return;
        // eslint-disable-next-line svelte/no-dom-manipulating
        preview.innerHTML = data.html;
        const runtime = window as unknown as {
            activateInteractiveElements?: (scripts: string[]) => void;
            removeEmptyPTags?: () => void;
        };
        if (code !== undefined) runtime.activateInteractiveElements?.([code]);
        runtime.removeEmptyPTags?.();
        bindSpoilers(preview);
        bindPlayKeys(preview);
    }

    $effect(() => {
        const markdown = value[active] ?? "";
        const locale = active;
        const code = scripts;
        clearTimeout(timer);
        timer = setTimeout(() => render(markdown, locale, code), 350);
        return () => clearTimeout(timer);
    });
</script>

<div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <label for={`${id}-${active}`} class="text-sm font-semibold">{label}</label>
        <LanguageTabs {languages} bind:active {filled} {label} />
    </div>
    <div class="grid gap-4 xl:grid-cols-2">
        {#each languages as language (language)}
            {#if language === active}
                <textarea
                    id={`${id}-${language}`}
                    class="field font-mono text-sm leading-relaxed"
                    lang={language}
                    spellcheck="true"
                    {rows}
                    bind:value={value[language]}></textarea>
            {/if}
        {/each}
        <section class="min-w-0 rounded-lg border border-dashed border-grid bg-paper p-5" aria-label={previewLabel}>
            <p class="mb-3 text-xs font-semibold text-muted">{previewLabel}</p>
            <div bind:this={preview} class={["md-content break-words", previewClass]}></div>
        </section>
    </div>
</div>
