<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import MarkdownField from "./MarkdownField.svelte";
    import SaveBar from "./SaveBar.svelte";
    import UrlField from "./UrlField.svelte";

    interface ProfileState {
        url: string;
        name: string;
        photo: string;
        socialMedia: Record<string, string>;
        about: Record<string, string>;
        directiveBoard: { year: string; role: string }[];
    }

    interface Props {
        profile: ProfileState;
        languages: string[];
        years: string[];
        strings: Strings;
        urlPrefix: string;
        editorBase: string;
        publicHref: string;
    }

    let { profile, languages, years, strings, urlPrefix, editorBase, publicHref }: Props = $props();
    const t = translator(strings);
    const editor = createEditor(profile, { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") });
    const networks = ["email", "instagram", "x", "linkedin"] as const;
    const roles = Object.keys(((strings.admin as Strings).directiveBoard as Strings).roles as Strings);
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const usedYears = $derived(editor.state.directiveBoard.map((entry) => entry.year));
    const freeYear = $derived([...years].reverse().find((year) => !usedYears.includes(year)));
    const emailInvalid = $derived(Boolean(editor.state.socialMedia.email?.trim()) && !EMAIL.test(editor.state.socialMedia.email.trim()));

    function addYear() {
        if (freeYear) editor.state.directiveBoard.push({ year: freeYear, role: "member" });
    }

    async function save() {
        const result = await editor.save((value) => actions.profiles.save({ ...value, currentUrl: profile.url }));
        if (result?.data && result.data !== profile.url) window.location.replace(`${editorBase}/${encodeURIComponent(String(result.data))}`);
    }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <div class="flex items-center gap-4">
        <img src={editor.state.photo || "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"} alt="" class="size-16 rounded-full border border-grid object-cover" />
        <div>
            <p class="text-sm text-muted">{t("admin.common.editing")}</p>
            <h1 class="font-serif text-4xl font-bold text-ink">{editor.state.name || t("admin.common.untitled")}</h1>
        </div>
    </div>
    <a class="text-sm text-muted underline underline-offset-2 hover:text-graphite" href={publicHref} target="_blank" rel="noopener">{t("admin.common.openPublic")}</a>
</div>

<div class="mt-8 grid gap-8">
    <UrlField label={t("admin.profiles.profile.urlSection")} prefix={urlPrefix} bind:value={editor.state.url} error={t("admin.profiles.profile.errors.url")} />

    <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="mb-2 text-sm font-semibold">{t("admin.profiles.profile.personalDataSection")}</legend>
        <label class="flex flex-col gap-2">
            <span class="text-sm text-muted">{t("admin.profiles.profile.personalData.name")}</span>
            <input class="field" bind:value={editor.state.name} autocomplete="off" />
        </label>
        <label class="flex flex-col gap-2">
            <span class="text-sm text-muted">{t("admin.profiles.profile.personalData.photo")}</span>
            <input class="field" type="url" bind:value={editor.state.photo} placeholder="https://" />
        </label>
    </fieldset>

    <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="mb-2 text-sm font-semibold">{t("admin.profiles.profile.socialMediaSection")}</legend>
        {#each networks as network (network)}
            <label class="flex flex-col gap-2">
                <span class="text-sm text-muted">{t(`admin.profiles.profile.socialMedia.${network}`)}</span>
                <input
                    class="field"
                    type={network === "email" ? "email" : "text"}
                    bind:value={editor.state.socialMedia[network]}
                    aria-invalid={network === "email" && emailInvalid} />
                {#if network === "email" && emailInvalid}
                    <span class="text-sm text-redpen">{t("admin.profiles.profile.errors.email")}</span>
                {/if}
            </label>
        {/each}
    </fieldset>

    <MarkdownField
        id="about"
        label={t("admin.profiles.profile.aboutSection")}
        {languages}
        bind:value={editor.state.about}
        rows={8}
        previewLabel={t("admin.common.preview")} />

    <fieldset class="flex flex-col gap-3">
        <legend class="mb-2 text-sm font-semibold">{t("admin.profiles.profile.directiveBoard")}</legend>
        {#if editor.state.directiveBoard.length > 0}
            <ul class="flex flex-col gap-2">
                {#each editor.state.directiveBoard as entry, index (index)}
                    <li class="flex flex-wrap items-center gap-2">
                        <select class="field w-32" bind:value={entry.year} aria-label={t("admin.directiveBoard.year")}>
                            {#each years as year (year)}
                                <option value={year} disabled={year !== entry.year && usedYears.includes(year)}>{year}</option>
                            {/each}
                        </select>
                        <select class="field w-auto flex-1" bind:value={entry.role} aria-label={t("admin.directiveBoard.role")}>
                            {#each roles as role (role)}
                                <option value={role}>{t(`admin.directiveBoard.roles.${role}`)}</option>
                            {/each}
                        </select>
                        <button type="button" class="rounded-md px-3 py-2 text-sm font-semibold text-redpen hover:bg-redpen/10" onclick={() => editor.state.directiveBoard.splice(index, 1)}>
                            {t("admin.profiles.profile.remove")}
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
        <button type="button" class="btn-quiet w-fit" disabled={!freeYear} onclick={addYear}>+ {t("admin.profiles.profile.addYear")}</button>
    </fieldset>
</div>

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.profiles.profile.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.profiles.profile.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={save} />
