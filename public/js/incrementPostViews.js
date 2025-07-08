document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;
    const currentPost = currentPath.split("/").pop();

    const readPosts = JSON.parse(localStorage.getItem("readPosts")) || [];
    if (!readPosts.includes(currentPost)) {
        const sendPostRequest = () => {
            fetch(`${currentPath}/increment-views`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            readPosts.push(currentPost);
            localStorage.setItem("readPosts", JSON.stringify(readPosts));
        };

        if (document.documentElement.scrollHeight > window.innerHeight) {
            const checkScroll = () => {
                if (window.scrollY / (document.body.scrollHeight - window.innerHeight) >= 0.5) {
                    sendPostRequest();
                    window.removeEventListener("scroll", checkScroll);
                }
            };
            window.addEventListener("scroll", checkScroll);
        } else sendPostRequest();
    }
});
