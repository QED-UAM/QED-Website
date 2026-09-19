<script lang="ts">
    // Language switcher for multilingual fields. Marks languages that have no text yet.
    interface Props {
        languages: string[];
        active: string;
        filled?: Record<string, boolean>;
        label: string;
    }

    let { languages, active = $bindable(), filled = {}, label }: Props = $props();
</script>

{#if languages.length > 1}
    <div class="flex gap-1" role="tablist" aria-label={label}>
        {#each languages as language (language)}
            <button
                type="button"
                role="tab"
                aria-selected={active === language}
                class={[
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase",
                    active === language ? "bg-ink text-paper" : "text-muted hover:bg-grid/70"
                ]}
                onclick={() => (active = language)}>
                <img src={`/images/flags/${language}.svg`} alt="" class="size-3.5" />
                {language}
                {#if !filled[language]}
                    <span class="size-1.5 rounded-full bg-redpen" title="—"></span>
                {/if}
            </button>
        {/each}
    </div>
{/if}
