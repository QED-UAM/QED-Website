// State shared by every admin editor: change tracking and saving through an Astro action.

export interface SaveResult {
    data?: unknown;
    error?: { message: string } | undefined;
}

export function createEditor<T>(initial: T, messages: { saved: string; failed: string }) {
    // JSON copy: props arrive as Svelte proxies, which structuredClone rejects.
    let state = $state(JSON.parse(JSON.stringify(initial)) as T);
    let baseline = $state(JSON.stringify(initial));
    let saving = $state(false);
    let status = $state("");
    let error = $state("");

    return {
        get state() {
            return state;
        },
        set state(value: T) {
            state = value;
        },
        get dirty() {
            return JSON.stringify(state) !== baseline;
        },
        get saving() {
            return saving;
        },
        get status() {
            return status;
        },
        get error() {
            return error;
        },
        /** Runs `save`; on success the current state becomes the new baseline. */
        async save<R extends SaveResult>(save: (value: T) => Promise<R>): Promise<R | undefined> {
            saving = true;
            error = "";
            try {
                const result = await save($state.snapshot(state) as T);
                if (result.error) {
                    error = result.error.message || messages.failed;
                    return undefined;
                }
                baseline = JSON.stringify(state);
                status = messages.saved;
                return result;
            } catch {
                error = messages.failed;
                return undefined;
            } finally {
                saving = false;
            }
        }
    };
}
