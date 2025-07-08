(() => {
    let scrollTimeout;
    let hovering = false;
    const scrollPercentageElement = document.getElementById("scroll-percentage");

    function updateScrollPercentage() {
        let percentage = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (isNaN(percentage)) percentage = 1;
        scrollPercentageElement.textContent = Math.min(Math.round(percentage * 100), 100) + "%";
        const scrollbarHeightPercentage = window.innerHeight / document.body.scrollHeight;
        scrollPercentageElement.style.top =
            window.innerHeight *
                (percentage * (1 - scrollbarHeightPercentage) + scrollbarHeightPercentage / 2) +
            "px";
    }

    function startTimeout() {
        scrollTimeout = setTimeout(() => {
            scrollPercentageElement.classList.remove("visible");
            scrollTimeout = null;
        }, 1000);
    }

    function showScrollPercentage() {
        updateScrollPercentage();
        scrollPercentageElement.classList.add("visible");

        if (!hovering) {
            clearTimeout(scrollTimeout);
            startTimeout();
        }
    }

    document.addEventListener("scroll", showScrollPercentage);
    document.addEventListener("resize", showScrollPercentage);
    const resizeObserver = new ResizeObserver((entries) => {
        const oldPercentage = scrollPercentageElement.innerText;
        updateScrollPercentage();
        if (scrollPercentageElement.innerText !== oldPercentage) showScrollPercentage();
    });
    resizeObserver.observe(document.body);

    document.addEventListener("mousemove", (e) => {
        if (e.clientX >= window.innerWidth - 8 && document.body.scrollHeight > window.innerHeight) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
            scrollPercentageElement.classList.add("visible");
            hovering = true;
        } else {
            hovering = false;
            if (scrollTimeout === null) startTimeout();
        }
    });

    document.addEventListener("mouseleave", () => {
        if (scrollTimeout === null) startTimeout();
    });

    document.addEventListener("DOMContentLoaded", updateScrollPercentage);
})();
