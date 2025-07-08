document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".spoiler-overlay").forEach((overlay) => {
        overlay.addEventListener("click", () => {
            overlay.classList.add("hide");
            setTimeout(() => overlay.remove(), 300);
        });
    });
});
