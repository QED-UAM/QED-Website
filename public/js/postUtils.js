function removeEmptyPTags() {
    const imageContainers = document.querySelectorAll("div.image-container");

    imageContainers.forEach((container) => {
        const prevSibling = container.previousElementSibling;
        const nextSibling = container.nextElementSibling;

        if (
            prevSibling &&
            prevSibling.tagName.toLowerCase() === "p" &&
            prevSibling.innerHTML.trim() === ""
        )
            prevSibling.remove();
        if (
            nextSibling &&
            nextSibling.tagName.toLowerCase() === "p" &&
            nextSibling.innerHTML.trim() === ""
        )
            nextSibling.remove();
    });
}

document.addEventListener("DOMContentLoaded", function () {
    removeEmptyPTags();
});
