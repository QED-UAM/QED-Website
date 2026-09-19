<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";

    // Admin index for one collection: search, create, edit and delete (with confirmation).
    interface Item {
        url: string;
        title: string;
        subtitle?: string;
        badge?: string;
        badgeTone?: "ok" | "muted";
        meta?: string;
        image?: string;
        publicHref?: string;
    }

    interface Group {
        title: string;
        items: Item[];
    }

    interface Props {
        kind: "profiles" | "magazines" | "posts" | "activities";
        heading: string;
        groups: Group[];
        editorBase: string;
        strings: Strings;
        section: string;
    }

    let { kind, heading, groups, editorBase, strings, section }: Props = $props();
    const t = translator(strings);

    let query = $state("");
    let confirming = $state<string | null>(null);
    let busy = $state(false);
    let error = $state("");
    let removed = $state<string[]>([]);

    const normalize = (text: string) =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");

    const visibleGroups = $derived(
        groups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        !removed.includes(item.url) &&
                        normalize(`${item.title} ${item.subtitle ?? ""} ${item.url}`).includes(normalize(query))
                )
            }))
            .filter((group) => group.items.length > 0)
    );

    async function create() {
        busy = true;
        error = "";
        const { data, error: failure } = await actions[kind].create();
        busy = false;
        if (failure || !data) {
            error = t("admin.common.createFailed");
            return;
        }
        window.location.href = `${editorBase}/${encodeURIComponent(data)}`;
    }

    async function remove(url: string) {
        busy = true;
        error = "";
        const { error: failure } = await actions[kind].delete({ url });
        busy = false;
        confirming = null;
        if (failure) error = t("admin.common.deleteFailed");
        else removed = [...removed, url];
    }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
    <h1 class="font-serif text-4xl font-bold text-ink">{heading}</h1>
    <button type="button" class="btn key" disabled={busy} onclick={create}>{t(`admin.${section}.new`)}</button>
</div>

<div class="mt-6">
    <label class="sr-only" for="admin-search">{t("admin.common.search")}</label>
    <input id="admin-search" type="search" class="field max-w-md" placeholder={t("admin.common.search")} bind:value={query} />
</div>

{#if error}
    <p role="alert" class="mt-4 text-sm font-medium text-redpen">{error}</p>
{/if}

{#if visibleGroups.length === 0}
    <p class="mt-10 text-muted">{query ? t("admin.common.noResults") : t("admin.common.noItems")}</p>
{/if}

{#each visibleGroups as group (group.title)}
    <section class="mt-8">
        {#if group.title}
            <h2 class="mb-2 font-serif text-xl font-bold text-muted italic">{group.title}</h2>
        {/if}
        <ul class="divide-y divide-grid overflow-hidden rounded-xl border border-grid bg-surface">
            {#each group.items as item (item.url)}
                <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    {#if item.image !== undefined}
                        <img
                            src={item.image || "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"}
                            alt=""
                            class="size-10 shrink-0 rounded-full border border-grid object-cover"
                            loading="lazy"
                        />
                    {/if}
                    <a href={`${editorBase}/${encodeURIComponent(item.url)}`} class="min-w-0 flex-1 hover:underline">
                        <span class="block truncate font-semibold">{item.title || t("admin.common.untitled")}</span>
                        <span class="block truncate text-xs text-muted">{item.subtitle ?? item.url}</span>
                    </a>
                    {#if item.meta}
                        <span class="text-xs text-muted tabular-nums">{item.meta}</span>
                    {/if}
                    {#if item.badge}
                        <span
                            class={[
                                "rounded-md px-2 py-0.5 text-xs font-semibold",
                                item.badgeTone === "ok" ? "bg-ink/10 text-ink" : "bg-grid text-muted"
                            ]}>{item.badge}</span>
                    {/if}
                    <div class="flex items-center gap-2">
                        {#if item.publicHref}
                            <a class="text-xs font-medium text-muted underline underline-offset-2 hover:text-graphite" href={item.publicHref} target="_blank" rel="noopener">
                                {t("admin.common.openPublic")}
                            </a>
                        {/if}
                        {#if confirming === item.url}
                            <span class="text-xs text-redpen">{t("admin.common.deleteConfirm", { name: item.title || item.url })}</span>
                            <button type="button" class="rounded-md bg-redpen px-3 py-1 text-xs font-semibold text-paper" disabled={busy} onclick={() => remove(item.url)}>
                                {t(`admin.${section}.confirm`)}
                            </button>
                            <button type="button" class="rounded-md px-3 py-1 text-xs font-semibold text-muted hover:bg-grid" onclick={() => (confirming = null)}>
                                {t(`admin.${section}.cancel`)}
                            </button>
                        {:else}
                            <a href={`${editorBase}/${encodeURIComponent(item.url)}`} class="rounded-md px-3 py-1 text-xs font-semibold text-ink hover:bg-grid/70">
                                {t(`admin.${section}.edit`)}
                            </a>
                            <button type="button" class="rounded-md px-3 py-1 text-xs font-semibold text-redpen hover:bg-redpen/10" onclick={() => (confirming = item.url)}>
                                {t(`admin.${section}.delete`)}
                            </button>
                        {/if}
                    </div>
                </li>
            {/each}
        </ul>
    </section>
{/each}
