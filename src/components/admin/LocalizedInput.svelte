<script lang="ts">
    import LanguageTabs from "./LanguageTabs.svelte";

    // A text field with one value per language (title, description…).
    interface Props {
        label: string;
        languages: string[];
        value: Record<string, string>;
        multiline?: boolean;
        id: string;
    }

    let { label, languages, value = $bindable(), multiline = false, id }: Props = $props();
    let active = $state(languages[0]);
    const filled = $derived(Object.fromEntries(languages.map((lang) => [lang, Boolean(value[lang]?.trim())])));
</script>

<div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <label for={`${id}-${active}`} class="text-sm font-semibold">{label}</label>
        <LanguageTabs {languages} bind:active {filled} {label} />
    </div>
    {#each languages as language (language)}
        {#if language === active}
            {#if multiline}
                <textarea id={`${id}-${language}`} class="field min-h-24" lang={language} bind:value={value[language]}></textarea>
            {:else}
                <input id={`${id}-${language}`} class="field" lang={language} bind:value={value[language]} />
            {/if}
        {/if}
    {/each}
</div>
