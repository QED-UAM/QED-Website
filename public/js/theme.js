// Theme (light / dark / auto). Loaded blocking in <head> so the page never flashes.
// Contract with interactive components stored in the database: the <html> element carries
// the "light"/"dark" class and every change dispatches `on-theme-change` on window with the
// resolved theme as `detail`. Also used by the static offline pages.
(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function stored() {
        try {
            return localStorage.getItem("theme") || "auto";
        } catch {
            return "auto";
        }
    }

    function setAppearance(theme, saveInStore = true, dispatchEvent = true) {
        const resetStyles = document.createElement("style");
        resetStyles.textContent = "*{transition: unset !important;}";
        resetStyles.setAttribute("data-theme-onload-styles", "");
        document.head.appendChild(resetStyles);

        if (saveInStore) {
            try {
                localStorage.setItem("theme", theme);
            } catch {
                /* private mode */
            }
        }
        const resolved = theme === "auto" ? (media.matches ? "dark" : "light") : theme;

        const classes = document.documentElement.classList;
        classes.remove("light", "dark", "default", "auto");
        classes.add(resolved);
        document.documentElement.dataset.themePreference = theme;

        setTimeout(() => resetStyles.remove(), 1);
        if (dispatchEvent) window.dispatchEvent(new CustomEvent("on-theme-change", { detail: resolved }));
    }

    window.setAppearance = setAppearance;

    media.addEventListener("change", () => {
        if (stored() === "auto") setAppearance("auto", false);
    });

    window.addEventListener("load", () => {
        document.querySelectorAll("[data-theme-value]").forEach((element) => {
            element.addEventListener("click", () =>
                setAppearance(element.getAttribute("data-theme-value"), true)
            );
        });
    });

    setAppearance(stored(), false);
})();
