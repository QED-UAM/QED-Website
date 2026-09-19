<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import LocalizedInput from "./LocalizedInput.svelte";
    import MarkdownField from "./MarkdownField.svelte";
    import SaveBar from "./SaveBar.svelte";
    import UrlField from "./UrlField.svelte";

    interface ActivityState {
        url: string;
        title: Record<string, string>;
        description: Record<string, string>;
        photo: string;
        scripts: string;
        content: Record<string, string>;
    }

    interface Props {
        activity: ActivityState;
        languages: string[];
        strings: Strings;
        urlPrefix: string;
        editorBase: string;
        publicHref: string;
    }

    let { activity, languages, strings, urlPrefix, editorBase, publicHref }: Props = $props();
    const t = translator(strings);
    const editor = createEditor(activity, { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") });

    async function save() {
        const result = await editor.save((value) => actions.activities.save({ ...value, currentUrl: activity.url }));
        if (result?.data && result.data !== activity.url) window.location.replace(`${editorBase}/${encodeURIComponent(String(result.data))}`);
    }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <div>
        <p class="text-sm text-muted">{t("admin.common.editing")}</p>
        <h1 class="font-serif text-4xl font-bold text-ink">{editor.state.title.es || t("admin.common.untitled")}</h1>
    </div>
    <a class="text-sm text-muted underline underline-offset-2 hover:text-graphite" href={publicHref} target="_blank" rel="noopener">{t("admin.common.openPublic")}</a>
</div>

<div class="mt-8 grid gap-8">
    <UrlField label={t("admin.activities.activity.urlSection")} prefix={urlPrefix} bind:value={editor.state.url} error={t("admin.activities.activity.errors.url")} />
    <LocalizedInput id="title" label={t("admin.activities.activity.titleSection")} {languages} bind:value={editor.state.title} />
    <MarkdownField
        id="description"
        label={t("admin.activities.activity.descriptionSection")}
        {languages}
        bind:value={editor.state.description}
        rows={5}
        previewLabel={t("admin.common.preview")} />
    <div class="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
        <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">{t("admin.activities.activity.photoSection")}</span>
            <input class="field" type="url" bind:value={editor.state.photo} placeholder="https://" />
        </label>
        {#if editor.state.photo}
            <img src={editor.state.photo} alt="" class="aspect-[4/3] w-40 rounded-lg border border-grid object-cover" />
        {/if}
    </div>
    <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{t("admin.activities.activity.scriptsSection")}</span>
        <textarea class="field font-mono text-sm" rows="8" spellcheck="false" bind:value={editor.state.scripts}></textarea>
    </label>
    <MarkdownField
        id="content"
        label={t("admin.activities.activity.contentSection")}
        {languages}
        bind:value={editor.state.content}
        scripts={editor.state.scripts}
        rows={24}
        previewLabel={t("admin.common.preview")}
        previewClass="article-body prose prose-custom dark:prose-invert max-w-none" />
</div>

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.activities.activity.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.activities.activity.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={save} />
