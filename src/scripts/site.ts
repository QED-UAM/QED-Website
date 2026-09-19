// Site-wide behavior: scroll percentage indicator next to the scrollbar and the offline
// service worker.

function scrollPercentage() {
    const element = document.getElementById("scroll-percentage");
    if (!element) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let hovering = false;

    const update = () => {
        const scrollable = document.body.scrollHeight - window.innerHeight;
        let percentage = scrollable > 0 ? window.scrollY / scrollable : 1;
        if (Number.isNaN(percentage)) percentage = 1;
        element.textContent = Math.min(Math.round(percentage * 100), 100) + "%";
        const thumb = window.innerHeight / document.body.scrollHeight;
        element.style.top = window.innerHeight * (percentage * (1 - thumb) + thumb / 2) + "px";
    };

    const hideLater = () => {
        timeout = setTimeout(() => {
            element.classList.remove("visible");
            timeout = null;
        }, 1000);
    };

    const show = () => {
        update();
        if (document.body.scrollHeight <= window.innerHeight) return;
        element.classList.add("visible");
        if (!hovering) {
            if (timeout) clearTimeout(timeout);
            hideLater();
        }
    };

    document.addEventListener("scroll", show, { passive: true });
    window.addEventListener("resize", show);
    new ResizeObserver(() => {
        const previous = element.textContent;
        update();
        if (element.textContent !== previous && window.scrollY > 0) show();
    }).observe(document.body);

    document.addEventListener("mousemove", (event) => {
        if (event.clientX >= window.innerWidth - 10 && document.body.scrollHeight > window.innerHeight) {
            if (timeout) clearTimeout(timeout);
            timeout = null;
            update();
            element.classList.add("visible");
            hovering = true;
        } else {
            hovering = false;
            if (timeout === null) hideLater();
        }
    });
    document.addEventListener("mouseleave", () => {
        if (timeout === null) hideLater();
    });
    update();
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline pages are a nice-to-have */
    });
}

scrollPercentage();
registerServiceWorker();
