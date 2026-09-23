// Behavior for markdown-rendered content (articles, activities, previews in the admin).

/** Solution spoilers: click (or Enter/Space) to reveal. */
export function bindSpoilers(root: ParentNode) {
    root.querySelectorAll<HTMLElement>(".spoiler-overlay:not([data-bound])").forEach((overlay) => {
        overlay.dataset.bound = "";
        overlay.tabIndex = 0;
        overlay.setAttribute("role", "button");
        const reveal = () => {
            overlay.classList.add("hide");
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.addEventListener("click", reveal);
        overlay.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                reveal();
            }
        });
    });
}

/**
 * Line breaks inside content render as a 10px spacer, as on the previous site (articles are
 * written with that spacing in mind).
 */
export function spaceLineBreaks(root: ParentNode) {
    root.querySelectorAll("br").forEach((br) => {
        const space = document.createElement("div");
        space.classList.add("custom-br");
        br.insertAdjacentElement("beforebegin", space);
        br.remove();
    });
}

/** Keyboard access for the play button of interactive components (an <svg> with a click handler). */
export function bindPlayKeys(root: ParentNode) {
    root.querySelectorAll<SVGElement>(".play-button:not([data-key-bound])").forEach((button) => {
        button.dataset.keyBound = "";
        button.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }
        });
    });
}

export function enhanceContent(root: HTMLElement) {
    spaceLineBreaks(root);
    bindSpoilers(root);
    bindPlayKeys(root);
}
