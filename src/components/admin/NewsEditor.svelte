<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import LocalizedInput from "./LocalizedInput.svelte";
    import MarkdownField from "./MarkdownField.svelte";
    import SaveBar from "./SaveBar.svelte";

    interface NewsState {
        url: string;
        title: Record<string, string>;
        description: Record<string, string>;
    }

    interface Props {
        news: NewsState;
        languages: string[];
        strings: Strings;
        origin: string;
    }

    let { news, languages, strings, origin }: Props = $props();
    const t = translator(strings);
    const editor = createEditor(news, { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") });
    let deleted = $state(false);

    async function save() {
        const result = await editor.save((value) => actions.news.save(value));
        deleted = result?.data === "deleted";
    }
</script>

<h1 class="font-serif text-4xl font-bold text-ink">{t("admin.news.title")}</h1>
<p class="mt-2 text-muted">{t("admin.news.preview")}</p>

<div class="mt-8 grid gap-8">
    <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{t("admin.news.urlSection")}</span>
        <span class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-grid bg-surface focus-within:border-ink">
            <span class="hidden items-center bg-paper px-3 text-sm text-muted sm:flex">{origin}/</span>
            <input class="w-full bg-transparent px-3 py-2.5 outline-none" bind:value={editor.state.url} spellcheck="false" />
        </span>
    </label>
    <LocalizedInput id="title" label={t("admin.news.titleSection")} {languages} bind:value={editor.state.title} />
    <MarkdownField id="description" label={t("admin.news.descriptionSection")} {languages} bind:value={editor.state.description} rows={8} previewLabel={t("admin.common.preview")} />
    {#if deleted}
        <p class="text-sm font-medium text-muted" role="status">{t("admin.news.deleted")}</p>
    {/if}
</div>

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.news.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.news.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={save} />
