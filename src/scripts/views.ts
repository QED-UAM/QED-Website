// Counts a read once per browser, when the reader gets halfway through the article (or
// immediately if it fits on screen). Same storage key and endpoint as the previous site.
export function trackRead() {
    const path = window.location.pathname.replace(/\/+$/, "");
    const post = path.split("/").pop() ?? "";

    let read: string[] = [];
    try {
        read = JSON.parse(localStorage.getItem("readPosts") ?? "[]") ?? [];
    } catch {
        read = [];
    }
    if (!post || read.includes(post)) return;

    const send = () => {
        fetch(`${path}/increment-views`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true
        }).catch(() => {});
        read.push(post);
        try {
            localStorage.setItem("readPosts", JSON.stringify(read));
        } catch {
            /* storage unavailable */
        }
    };

    if (document.documentElement.scrollHeight > window.innerHeight) {
        const onScroll = () => {
            if (window.scrollY / (document.body.scrollHeight - window.innerHeight) >= 0.5) {
                window.removeEventListener("scroll", onScroll);
                send();
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
    } else {
        send();
    }
}
