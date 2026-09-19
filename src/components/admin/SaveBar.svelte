<script lang="ts">
    // Sticky save bar: unsaved-changes state, Ctrl/Cmd+S, and a warning before leaving with
    // unsaved changes.
    interface Props {
        dirty: boolean;
        saving: boolean;
        status: string;
        error: string;
        label: string;
        savingLabel: string;
        unsavedLabel: string;
        shortcutLabel: string;
        onsave: () => void;
    }

    let { dirty, saving, status, error, label, savingLabel, unsavedLabel, shortcutLabel, onsave }: Props = $props();

    function keydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            if (dirty && !saving) onsave();
        }
    }

    function beforeunload(event: BeforeUnloadEvent) {
        if (dirty) event.preventDefault();
    }
</script>

<svelte:window onkeydown={keydown} onbeforeunload={beforeunload} />

<div class="sticky bottom-4 z-30 mt-10">
    <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-grid bg-surface/95 px-5 py-3 shadow-[0_10px_30px_-12px_rgb(15_23_42/0.35)] backdrop-blur">
        <div class="min-w-0 text-sm" aria-live="polite">
            {#if error}
                <p class="font-medium whitespace-pre-line text-redpen">{error}</p>
            {:else if dirty}
                <p class="text-graphite">{unsavedLabel} <span class="text-muted">({shortcutLabel})</span></p>
            {:else if status}
                <p class="text-muted">{status}</p>
            {/if}
        </div>
        <button type="button" class="btn key" disabled={!dirty || saving} onclick={onsave}>
            {saving ? savingLabel : label}
        </button>
    </div>
</div>

<style>
    button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        transform: none;
    }
</style>
