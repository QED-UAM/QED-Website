<script lang="ts">
    import { actions } from "astro:actions";
    import { translator, type Strings } from "./i18n";
    import { createEditor } from "./editor.svelte";
    import SaveBar from "./SaveBar.svelte";

    interface Account {
        email: string;
        name?: string;
        photo?: string;
    }

    interface Props {
        accounts: Account[];
        qedEmail: string;
        currentEmail: string;
        strings: Strings;
    }

    let { accounts, qedEmail, currentEmail, strings }: Props = $props();
    const t = translator(strings);
    const known = new Map(accounts.map((account) => [account.email, account]));
    const editor = createEditor(
        { emails: accounts.map((account) => account.email).filter((email) => email !== qedEmail) },
        { saved: t("admin.common.saved"), failed: t("admin.common.errorGeneric") }
    );
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let draft = $state("");
    let draftError = $state("");

    function add() {
        const email = draft.trim();
        if (!email) return;
        if (!EMAIL.test(email)) {
            draftError = t("admin.accounts.enterValidAddress");
            return;
        }
        if (email !== qedEmail && !editor.state.emails.includes(email)) editor.state.emails.push(email);
        draft = "";
        draftError = "";
    }

    const rows = $derived([qedEmail, ...editor.state.emails]);
</script>

<h1 class="font-serif text-4xl font-bold text-ink">{t("admin.accounts.adminAccounts")}</h1>

<ul class="mt-8 max-w-2xl divide-y divide-grid overflow-hidden rounded-xl border border-grid bg-surface">
    {#each rows as email (email)}
        {@const account = known.get(email)}
        <li class="flex items-center gap-4 px-4 py-3">
            <img
                src={account?.photo || "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"}
                alt=""
                class="size-10 rounded-full border border-grid object-cover"
                referrerpolicy="no-referrer" />
            <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">
                    {#if email === currentEmail}<span class="text-muted">({t("admin.accounts.you")})</span>{/if}
                    {account?.name || email}
                </p>
                {#if account?.name}<p class="truncate text-sm text-muted">{email}</p>{/if}
            </div>
            {#if email !== qedEmail}
                <button
                    type="button"
                    class="rounded-md px-3 py-1.5 text-sm font-semibold text-redpen hover:bg-redpen/10"
                    onclick={() => editor.state.emails.splice(editor.state.emails.indexOf(email), 1)}>
                    {t("admin.accounts.delete")}
                </button>
            {/if}
        </li>
    {/each}
</ul>

<form class="mt-6 flex max-w-2xl flex-wrap items-start gap-3" onsubmit={(event) => { event.preventDefault(); add(); }}>
    <label class="flex min-w-60 flex-1 flex-col gap-1">
        <span class="sr-only">{t("admin.accounts.addEmail")}</span>
        <input class="field" type="email" placeholder={t("admin.accounts.addEmailDesc")} bind:value={draft} aria-invalid={Boolean(draftError)} />
        {#if draftError}<span class="text-sm text-redpen">{draftError}</span>{/if}
    </label>
    <button type="submit" class="btn key">{t("admin.accounts.addEmail")}</button>
</form>

<SaveBar
    dirty={editor.dirty}
    saving={editor.saving}
    status={editor.status}
    error={editor.error}
    label={t("admin.accounts.submit")}
    savingLabel={t("admin.common.saving")}
    unsavedLabel={t("admin.accounts.unsavedChanges")}
    shortcutLabel={t("admin.common.saveShortcut")}
    onsave={() => editor.save((value) => actions.admins.save(value))} />
