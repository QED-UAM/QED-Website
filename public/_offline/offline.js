// Offline pages: reload as soon as the site answers its health check again.
(() => {
    const INTERVAL = 3000;
    let timer;

    async function check() {
        try {
            const response = await fetch("/endpoints/health", { cache: "no-store" });
            if (response.ok) {
                window.location.reload();
                return;
            }
        } catch {
            /* still offline */
        }
        timer = setTimeout(check, INTERVAL);
    }

    window.addEventListener("online", () => {
        clearTimeout(timer);
        check();
    });
    check();
})();
