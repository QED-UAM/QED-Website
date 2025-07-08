document.querySelectorAll("br").forEach((br) => {
    const space = document.createElement("div");
    space.classList.add("custom-br");
    br.insertAdjacentElement("beforebegin", space);
    br.remove();
});
