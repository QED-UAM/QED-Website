<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import LocalizedInput from "./LocalizedInput.svelte";
    import MarkdownField from "./MarkdownField.svelte";
    import SaveBar from "./SaveBar.svelte";
    import UrlField from "./UrlField.svelte";

    interface PostState {
        url: string;
        title: Record<string, string>;
        description: Record<string, string>;
        scripts: string;
        content: Record<string, string>;
        authors: { user_id: string; role: string }[];
        magazine_id: string | null;
        type: string;
    }

    interface Props {
        post: PostState;
        views: number;
        users: { id: string; name: string; photo: string }[];
        magazines: { id: string; title: string }[];
        languages: string[];
        strings: Strings;
        urlPrefix: string;
        editorBase: string;
        publicHref: string | null;
    }

    let { post, views, users, magazines, languages, strings, urlPrefix, editorBase, publicHref }: Props = $props();
    const t = translator(strings);
    const editor = createEditor(post, { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") });
    const roles = Object.keys((strings.roles as Strings) ?? {});
    const types = Object.keys((strings.postTypes as Strings) ?? {});

    let search = $state("");
    let pickerOpen = $state(false);
    const byId = new Map(users.map((user) => [user.id, user]));
    const candidates = $derived(
        users.filter(
            (user) =>
                !editor.state.authors.some((author) => author.user_id === user.id) &&
                user.name.toLowerCase().includes(search.toLowerCase())
        )
    );

    function addAuthor(id: string) {
        editor.state.authors.push({ user_id: id, role: roles[0] ?? "author" });
        search = "";
        pickerOpen = false;
    }

    function move(index: number, delta: number) {
        const list = editor.state.authors;
        const target = index + delta;
        if (target < 0 || target >= list.length) return;
        [list[index], list[target]] = [list[target], list[index]];
    }

    async function save() {
        const result = await editor.save((value) => actions.posts.save({ ...value, currentUrl: post.url }));
        if (result?.data && result.data !== post.url) window.location.replace(`${editorBase}/${encodeURIComponent(String(result.data))}`);
    }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <div>
        <p class="text-sm text-muted">{t("admin.common.editing")}</p>
        <h1 class="font-serif text-4xl font-bold text-ink">{editor.state.title.es || t("admin.common.untitled")}</h1>
    </div>
    <div class="flex items-center gap-4 text-sm text-muted">
        <span>{t("admin.common.views", { count: views })}</span>
        {#if publicHref}
            <a class="underline underline-offset-2 hover:text-graphite" href={publicHref} target="_blank" rel="noopener">{t("admin.common.openPublic")}</a>
        {/if}
    </div>
</div>

<div class="mt-8 grid gap-8">
    <UrlField label={t("admin.posts.post.urlSection")} prefix={urlPrefix} bind:value={editor.state.url} error={t("admin.posts.post.errors.url")} />

    <div class="grid gap-6 md:grid-cols-2">
        <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">{t("admin.posts.post.magazineSection")}</span>
            <select class="field" bind:value={editor.state.magazine_id}>
                <option value={null}>{t("admin.posts.post.magazine.noMagazine")}</option>
                {#each magazines as magazine (magazine.id)}
                    <option value={magazine.id}>{magazine.title || t("admin.common.untitled")}</option>
                {/each}
            </select>
        </label>
        <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">{t("admin.posts.post.typeSection")}</span>
            <select class="field" bind:value={editor.state.type}>
                {#each types as type (type)}
                    <option value={type}>{t(`postTypes.${type}`)}</option>
                {/each}
            </select>
        </label>
    </div>

    <LocalizedInput id="title" label={t("admin.posts.post.titleSection")} {languages} bind:value={editor.state.title} />
    <LocalizedInput id="description" label={t("admin.posts.post.descriptionSection")} {languages} multiline bind:value={editor.state.description} />

    <fieldset class="flex flex-col gap-3">
        <legend class="mb-2 text-sm font-semibold">{t("admin.posts.post.authorsSection")}</legend>
        {#if editor.state.authors.length > 0}
            <ol class="divide-y divide-grid overflow-hidden rounded-lg border border-grid bg-surface">
                {#each editor.state.authors as author, index (author.user_id)}
                    {@const user = byId.get(author.user_id)}
                    <li class="flex flex-wrap items-center gap-3 px-3 py-2">
                        <img src={user?.photo} alt="" class="size-8 rounded-full border border-grid object-cover" />
                        <span class="min-w-0 flex-1 truncate font-medium">{user?.name ?? author.user_id}</span>
                        <select class="field w-auto py-1.5 text-sm" bind:value={author.role} aria-label={t("admin.directiveBoard.role")}>
                            {#each roles as role (role)}
                                <option value={role}>{t(`roles.${role}`)}</option>
                            {/each}
                        </select>
                        <button type="button" class="rounded px-2 py-1 text-muted hover:bg-grid" aria-label={t("admin.common.moveUp")} onclick={() => move(index, -1)}>↑</button>
                        <button type="button" class="rounded px-2 py-1 text-muted hover:bg-grid" aria-label={t("admin.common.moveDown")} onclick={() => move(index, 1)}>↓</button>
                        <button type="button" class="rounded px-2 py-1 text-sm font-semibold text-redpen hover:bg-redpen/10" onclick={() => editor.state.authors.splice(index, 1)}>
                            {t("admin.posts.delete")}
                        </button>
                    </li>
                {/each}
            </ol>
        {/if}
        <div class="relative max-w-md">
            <input
                type="search"
                class="field"
                placeholder={t("admin.posts.post.authors.search")}
                aria-label={t("admin.posts.post.authors.select")}
                bind:value={search}
                onfocus={() => (pickerOpen = true)}
                onkeydown={(event) => {
                    if (event.key === "Escape") pickerOpen = false;
                    if (event.key === "Enter" && candidates[0]) {
                        event.preventDefault();
                        addAuthor(candidates[0].id);
                    }
                }} />
            {#if pickerOpen && candidates.length > 0}
                <ul class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-grid bg-surface py-1 shadow-lg">
                    {#each candidates.slice(0, 50) as user (user.id)}
                        <li>
                            <button type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-grid/60" onclick={() => addAuthor(user.id)}>
                                <img src={user.photo} alt="" class="size-7 rounded-full border border-grid object-cover" />
                                {user.name || user.id}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </fieldset>

    <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold">{t("admin.posts.post.scriptsSection")}</span>
        <textarea class="field font-mono text-sm" rows="10" spellcheck="false" bind:value={editor.state.scripts}></textarea>
    </label>

    <MarkdownField
        id="content"
        label={t("admin.posts.post.contentSection")}
        {languages}
        bind:value={editor.state.content}
        scripts={editor.state.scripts}
        rows={24}
        previewLabel={t("admin.common.preview")}
        previewClass="article-body prose prose-custom dark:prose-invert max-w-none" />
</div>

<svelte:window onclick={(event) => {
    if (!(event.target as HTMLElement).closest(".relative")) pickerOpen = false;
}} />

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.posts.post.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.posts.post.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={save} />
