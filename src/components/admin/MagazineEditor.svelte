<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import LocalizedInput from "./LocalizedInput.svelte";
    import MarkdownField from "./MarkdownField.svelte";
    import SaveBar from "./SaveBar.svelte";
    import UrlField from "./UrlField.svelte";

    interface MagazineState {
        url: string;
        title: Record<string, string>;
        cover: string;
        visible: boolean;
        description: Record<string, string>;
    }

    interface Props {
        magazine: MagazineState;
        languages: string[];
        strings: Strings;
        urlPrefix: string;
        editorBase: string;
        publicHref: string;
    }

    let { magazine, languages, strings, urlPrefix, editorBase, publicHref }: Props = $props();
    const t = translator(strings);
    const editor = createEditor(magazine, { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") });

    async function save() {
        const result = await editor.save((value) => actions.magazines.save({ ...value, currentUrl: magazine.url }));
        if (result?.data && result.data !== magazine.url) window.location.replace(`${editorBase}/${encodeURIComponent(String(result.data))}`);
    }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <div>
        <p class="text-sm text-muted">{t("admin.common.editing")}</p>
        <h1 class="font-serif text-4xl font-bold text-ink">{editor.state.title.es || t("admin.common.untitled")}</h1>
    </div>
    {#if magazine.visible}
        <a class="text-sm text-muted underline underline-offset-2 hover:text-graphite" href={publicHref} target="_blank" rel="noopener">{t("admin.common.openPublic")}</a>
    {/if}
</div>

<div class="mt-8 grid gap-8">
    <UrlField label={t("admin.magazines.magazine.urlSection")} prefix={urlPrefix} bind:value={editor.state.url} error={t("admin.magazines.magazine.errors.url")} />

    <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 text-sm font-semibold">{t("admin.magazines.magazine.visibleSection")}</legend>
        <label class="inline-flex w-fit cursor-pointer items-center gap-3">
            <input type="checkbox" class="peer sr-only" bind:checked={editor.state.visible} />
            <span class="relative h-6 w-11 rounded-full bg-grid transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-marker after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"></span>
            <span class="font-medium">{editor.state.visible ? t("admin.magazines.magazine.visible") : t("admin.magazines.magazine.hidden")}</span>
        </label>
    </fieldset>

    <LocalizedInput id="title" label={t("admin.magazines.magazine.titleSection")} {languages} bind:value={editor.state.title} />

    <div class="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
        <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">{t("admin.magazines.magazine.coverSection")}</span>
            <input class="field" type="url" bind:value={editor.state.cover} placeholder="https://" />
        </label>
        {#if editor.state.cover}
            <img src={editor.state.cover} alt="" class="aspect-[1/1.414] w-32 rounded border border-grid object-cover" />
        {/if}
    </div>

    <MarkdownField
        id="description"
        label={t("admin.magazines.magazine.descriptionSection")}
        {languages}
        bind:value={editor.state.description}
        rows={10}
        previewLabel={t("admin.common.preview")} />
</div>

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.magazines.magazine.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.magazines.magazine.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={save} />
