<script lang="ts">
    // Slug field with the same rules as the server (letters, numbers, _ and -, at least 4).
    interface Props {
        label: string;
        prefix: string;
        value: string;
        error: string;
        pattern?: RegExp;
    }

    let { label, prefix, value = $bindable(), error, pattern = /^[a-zA-Z0-9_-]{4,}$/ }: Props = $props();
    const invalid = $derived(!pattern.test(value.trim()));

    function normalize(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        value = input.value.replace(/\s+/g, "-").replace(/-+/g, "-");
    }
</script>

<label class="flex flex-col gap-2">
    <span class="text-sm font-semibold">{label}</span>
    <span class="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-grid bg-surface focus-within:border-ink">
        <span class="hidden items-center bg-paper px-3 text-sm text-muted sm:flex">{prefix}</span>
        <input class="w-full bg-transparent px-3 py-2.5 outline-none" {value} oninput={normalize} aria-invalid={invalid} spellcheck="false" />
    </span>
    {#if invalid}
        <span class="text-sm text-redpen">{error}</span>
    {/if}
</label>
