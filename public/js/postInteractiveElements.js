const ielightbgrgb = "rgb(243, 244, 246)";
const ielightbgclass = "gray-100";
const ielightmainrgb = "rgb(209, 213, 219)";
const ielightmainclass = "gray-300";
const ielightcontrastrgb = "rgb(37, 99, 235)";
const ielightcontrastclass = "blue-600";
const iedarkbgrgb = "rgb(55, 65, 81)";
const iedarkbgclass = "gray-700";
const iedarkmainrgb = "rgb(107, 114, 128)";
const iedarkmainclass = "gray-500";
const iedarkcontrastrgb = "rgb(191, 219, 254)";
const iedarkcontrastclass = "blue-200";

function toggleControls(instanceName) {
    const controlsContainer = document.getElementById(`controls-${instanceName}`);
    const arrow = document.getElementById(`arrow-${instanceName}`);

    if (controlsContainer.classList.contains("h-0")) {
        controlsContainer.classList.remove("h-0");
        controlsContainer.classList.remove("py-0");
        controlsContainer.classList.remove("border-y-0");
        controlsContainer.classList.add("h-fit");
        controlsContainer.classList.add("py-2");
        arrow.classList.add("rotate-180");
    } else {
        controlsContainer.classList.add("h-0");
        controlsContainer.classList.add("py-0");
        controlsContainer.classList.add("border-y-0");
        controlsContainer.classList.remove("h-fit");
        controlsContainer.classList.remove("py-2");
        arrow.classList.remove("rotate-180");
    }
}

function activateInteractiveElements(scripts) {
    const translations = {
        es: {
            stop: "Detener",
            reset: "Reiniciar",
            pause: "Pausar",
            resume: "Reanudar",
            clearData: "Borrar Datos"
        },
        en: {
            stop: "Stop",
            reset: "Reset",
            pause: "Pause",
            resume: "Resume",
            clearData: "Clear Data"
        }
    };
    const lang = document.getElementById("current-lang-icon").alt.toLowerCase();
    extractAndEvaluateScripts(scripts || []);
    document.querySelectorAll(".interactive-placeholder").forEach((placeholder) => {
        const scriptName = placeholder.dataset.script;
        const params = JSON.parse(`[${placeholder.dataset.params}]`);
        let savedState = null;
        const instanceName = placeholder.dataset.instanceName;
        let options = placeholder.dataset.options.split(",").map((option) => option.trim());

        const controlsContainer = document.getElementById(`controls-${instanceName}`);
        controlsContainer.innerHTML = "";
        const controlsArrow = document.getElementById(`controls-arrow-${instanceName}`);
        controlsArrow.classList.add("flex");
        controlsArrow.classList.remove("hidden");
        const playButton = placeholder.querySelector(".play-button");
        const loadingAnimation = placeholder.querySelector(".loading-animation");
        const overlay = document.getElementById(`overlay-${instanceName}`);
        const interactiveContainer = document.getElementById(
            `interactive-container-${instanceName}`
        );
        let isManuallyPaused = false;

        if (options.includes("autoPauseOnScroll") && !options.includes("allowPause")) {
            options.push("allowPause");
            console.warn(
                `Warning: allowPause has been added to the options because autoPauseOnScroll is present.`
            );
        }

        function interactiveElementPause() {
            pauseButton.classList.add("hidden");
            resumeButton.classList.remove("hidden");
            isManuallyPaused = true;
            if (window[instanceName]) {
                window[instanceName].running = false;
                clearTimeout(window[instanceName].elementTimeout);
            }
        }

        function interactiveElementResume() {
            resumeButton.classList.add("hidden");
            pauseButton.classList.remove("hidden");
            isManuallyPaused = false;
            if (window[instanceName]) {
                window[instanceName].running = true;
                window[instanceName].iter();
            }
        }

        let pauseButton, resumeButton, fullscreenButton;
        if (options.includes("allowPause")) {
            const pauseResumeContainer = document.createElement("div");
            pauseResumeContainer.className = "w-full text-center";
            controlsContainer.appendChild(pauseResumeContainer);

            pauseButton = document.createElement("a");
            pauseButton.href = "javascript:;";
            pauseButton.className = "text-blue-500 dark:text-blue-300 hover:underline";
            pauseButton.textContent = translations[lang].pause;
            pauseResumeContainer.appendChild(pauseButton);

            resumeButton = document.createElement("a");
            resumeButton.href = "javascript:;";
            resumeButton.className = "hidden text-blue-500 dark:text-blue-300 hover:underline";
            resumeButton.textContent = translations[lang].resume;
            pauseResumeContainer.appendChild(resumeButton);

            pauseButton.addEventListener("click", (event) => {
                event.preventDefault();
                interactiveElementPause();
            });

            resumeButton.addEventListener("click", (event) => {
                event.preventDefault();
                interactiveElementResume();
            });
        }

        if (options.includes("saveStates")) {
            const clearDataContainer = document.createElement("div");
            clearDataContainer.className = "w-full text-center";
            controlsContainer.appendChild(clearDataContainer);

            const clearDataButton = document.createElement("a");
            clearDataButton.href = "javascript:;";
            clearDataButton.className = "text-blue-500 dark:text-blue-300 hover:underline";
            clearDataButton.textContent = translations[lang].clearData;
            clearDataContainer.appendChild(clearDataButton);

            clearDataButton.addEventListener("click", (event) => {
                event.preventDefault();
                if (window[instanceName]) {
                    window[instanceName].clearData();
                    savedState = null;
                    window[instanceName].reset();
                }
            });
        }

        function addFullscreenButton() {
            fullscreenButton = document.createElement("a");
            fullscreenButton.href = "javascript:;";
            fullscreenButton.className =
                "fullscreen-link absolute bottom-2 right-2 text-black dark:text-white hover:underline w-6 h-6 z-10";
            const enterFullscreenIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path d="M4 12 L4 4 12 4 M20 4 L28 4 28 12 M4 20 L4 28 12 28 M28 20 L28 28 20 28"/>
                </svg>
            `;
            const exitFullscreenIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentcolor" stroke="currentcolor" viewBox="0 0 385.331 385.331" xml:space="preserve">
                <g>
                <path d="M264.943,156.665h108.273c6.833,0,11.934-5.39,11.934-12.211c0-6.833-5.101-11.85-11.934-11.838h-96.242V36.181    c0-6.833-5.197-12.03-12.03-12.03s-12.03,5.197-12.03,12.03v108.273c0,0.036,0.012,0.06,0.012,0.084    c0,0.036-0.012,0.06-0.012,0.096C252.913,151.347,258.23,156.677,264.943,156.665z" />
                <path d="M120.291,24.247c-6.821,0-11.838,5.113-11.838,11.934v96.242H12.03c-6.833,0-12.03,5.197-12.03,12.03    c0,6.833,5.197,12.03,12.03,12.03h108.273c0.036,0,0.06-0.012,0.084-0.012c0.036,0,0.06,0.012,0.096,0.012    c6.713,0,12.03-5.317,12.03-12.03V36.181C132.514,29.36,127.124,24.259,120.291,24.247z" />
                <path d="M120.387,228.666H12.115c-6.833,0.012-11.934,5.39-11.934,12.223c0,6.833,5.101,11.85,11.934,11.838h96.242v96.423    c0,6.833,5.197,12.03,12.03,12.03c6.833,0,12.03-5.197,12.03-12.03V240.877c0-0.036-0.012-0.06-0.012-0.084    c0-0.036,0.012-0.06,0.012-0.096C132.418,233.983,127.1,228.666,120.387,228.666z" />
                <path d="M373.3,228.666H265.028c-0.036,0-0.06,0.012-0.084,0.012c-0.036,0-0.06-0.012-0.096-0.012    c-6.713,0-12.03,5.317-12.03,12.03v108.273c0,6.833,5.39,11.922,12.223,11.934c6.821,0.012,11.838-5.101,11.838-11.922v-96.242    H373.3c6.833,0,12.03-5.197,12.03-12.03S380.134,228.678,373.3,228.666z" />
                </g>
                </svg>
            `;
            fullscreenButton.innerHTML = enterFullscreenIcon;
            interactiveContainer
                .querySelector(".interactive-content")
                .appendChild(fullscreenButton);

            fullscreenButton.addEventListener("click", (event) => {
                event.preventDefault();

                if (!document.fullscreenElement) {
                    if (interactiveContainer.requestFullscreen) {
                        interactiveContainer.requestFullscreen();
                    } else if (interactiveContainer.mozRequestFullScreen) {
                        // Firefox
                        interactiveContainer.mozRequestFullScreen();
                    } else if (interactiveContainer.webkitRequestFullscreen) {
                        // Chrome, Safari and Opera
                        interactiveContainer.webkitRequestFullscreen();
                    } else if (interactiveContainer.msRequestFullscreen) {
                        // IE/Edge
                        interactiveContainer.msRequestFullscreen();
                    }
                    interactiveContainer.classList.remove("rounded-t-xl");
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        // Firefox
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        // Chrome, Safari and Opera
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        // IE/Edge
                        document.msExitFullscreen();
                    }
                    interactiveContainer.classList.add("rounded-t-xl");
                }
            });

            document.addEventListener("fullscreenchange", () => {
                if (document.fullscreenElement) {
                    fullscreenButton.innerHTML = exitFullscreenIcon;
                    interactiveContainer.classList.remove("rounded-t-xl");
                } else {
                    fullscreenButton.innerHTML = enterFullscreenIcon;
                    interactiveContainer.classList.add("rounded-t-xl");
                }
            });
        }

        function checkVisibility() {
            const margin = 100;
            const rect = interactiveContainer.getBoundingClientRect();
            const isVisible = rect.bottom >= -margin && rect.top <= window.innerHeight + margin;

            if (!isVisible && window[instanceName]?.running && !isManuallyPaused) {
                if (window[instanceName]) {
                    window[instanceName].running = false;
                    clearTimeout(window[instanceName].elementTimeout);
                }
                if (pauseButton) {
                    pauseButton.classList.add("hidden");
                    resumeButton.classList.remove("hidden");
                }
            } else if (isVisible && !window[instanceName]?.running && !isManuallyPaused) {
                if (window[instanceName]) {
                    window[instanceName].running = true;
                    window[instanceName].iter();
                }
                if (pauseButton) {
                    resumeButton.classList.add("hidden");
                    pauseButton.classList.remove("hidden");
                }
            }
        }

        if (options.includes("autoPauseOnScroll")) {
            window.addEventListener("scroll", checkVisibility);
            window.addEventListener("resize", checkVisibility);
        }

        const stopContainer = document.createElement("div");
        stopContainer.className = "w-full text-center";
        if (!options.includes("noStop")) controlsContainer.appendChild(stopContainer);

        const stopButton = document.createElement("a");
        stopButton.href = "javascript:;";
        stopButton.className = "text-blue-500 dark:text-blue-300 hover:underline";
        stopButton.textContent = translations[lang].stop;
        stopContainer.appendChild(stopButton);

        const resetContainer = document.createElement("div");
        resetContainer.className = "w-full text-center";
        controlsContainer.appendChild(resetContainer);

        const resetLink = document.createElement("a");
        resetLink.href = "javascript:;";
        resetLink.className = "text-blue-500 dark:text-blue-300 hover:underline";
        resetLink.textContent = translations[lang].reset;
        resetContainer.appendChild(resetLink);

        function interactiveElementStop() {
            overlay.classList.remove("hidden");
            playButton.classList.remove("hidden");
            loadingAnimation.classList.add("hidden");
            if (pauseButton) {
                pauseButton.classList.remove("hidden");
                resumeButton.classList.add("hidden");
            }
            if (window[instanceName]) {
                window[instanceName].running = false;
                clearTimeout(window[instanceName].elementTimeout);
                delete window[instanceName];
            }
            const contentContainer = interactiveContainer.querySelector(".interactive-content");
            if (contentContainer) contentContainer.remove();
        }

        stopButton.addEventListener("click", (event) => {
            event.preventDefault();
            interactiveElementStop();
        });

        options.forEach((option) => {
            if (option.startsWith("h=")) {
                let h = parseInt(option.substring(2)) / 4;
                if (isNaN(h)) interactiveContainer.classList.add(`h-${option.substring(2)}`);
                else interactiveContainer.style.height = h + "rem";
            }
        });

        async function interactiveElementPlay() {
            playButton.classList.add("hidden");
            overlay.classList.remove("hidden");
            loadingAnimation.classList.remove("hidden");
            if (pauseButton) {
                pauseButton.classList.remove("hidden");
                resumeButton.classList.add("hidden");
            }
            try {
                if (window[instanceName]) window[instanceName].running = false;
                const instance = new window.interactiveElements[scriptName]();
                window[instanceName] = instance;
                const contentContainer = interactiveContainer.querySelector(".interactive-content");
                if (contentContainer) contentContainer.remove();
                const newContentContainer = document.createElement("div");
                newContentContainer.className =
                    "interactive-content w-full h-full bg-gray-100 dark:bg-gray-700";
                interactiveContainer.appendChild(newContentContainer);
                instance.iter = () => {
                    if (instance.running) {
                        if (instance.main) {
                            instance.main();
                            instance.elementTimeout = setTimeout(instance.iter, 10); // 100 fps
                        }
                    }
                };

                if (options.includes("saveStates")) {
                    const urlParts = document.location.pathname.split("/");
                    const url = urlParts[urlParts.length - 1];
                    let storageData =
                        JSON.parse(localStorage.getItem("interactiveElementStates")) || {};
                    if (
                        storageData[url] &&
                        storageData[url][scriptName] &&
                        storageData[url][scriptName][instanceName]
                    )
                        savedState = storageData[url][scriptName][instanceName];
                    instance.saveData = (data) => {
                        let storageData =
                            JSON.parse(localStorage.getItem("interactiveElementStates")) || {};
                        if (!storageData[url]) storageData[url] = {};
                        if (!storageData[url][scriptName]) storageData[url][scriptName] = {};
                        storageData[url][scriptName][instanceName] = data;
                        localStorage.setItem(
                            "interactiveElementStates",
                            JSON.stringify(storageData)
                        );
                    };
                    function clearData() {
                        let storageData =
                            JSON.parse(localStorage.getItem("interactiveElementStates")) || {};
                        if (storageData[url] && storageData[url][scriptName]) {
                            delete storageData[url][scriptName][instanceName];
                            if (Object.keys(storageData[url][scriptName]).length === 0) {
                                delete storageData[url][scriptName];
                                if (Object.keys(storageData[url]).length === 0) {
                                    delete storageData[url];
                                    if (Object.keys(storageData).length === 0) {
                                        localStorage.removeItem("interactiveElementStates");
                                        return;
                                    }
                                }
                            }
                        }
                        localStorage.setItem(
                            "interactiveElementStates",
                            JSON.stringify(storageData)
                        );
                    }
                    instance.clearData = clearData;
                }

                if (options.includes("allowPause")) {
                    instance.pause = interactiveElementPause;
                    instance.resume = interactiveElementResume;
                }

                instance.reset = interactiveElementPlay;
                instance.stop = interactiveElementStop;

                await instance.start(newContentContainer, params, savedState);
                instance.running = true;
                isManuallyPaused = false;
                if (options.includes("allowFullscreen")) addFullscreenButton();
                if (options.includes("autoPauseOnScroll")) checkVisibility();
                overlay.classList.add("hidden");
                instance.iter();
            } catch (error) {
                console.error(`Error starting instance ${instanceName}:`, error);
                loadingAnimation.classList.add("hidden");
                playButton.classList.remove("hidden");
            }
        }

        resetLink.addEventListener("click", (event) => {
            event.preventDefault();
            interactiveElementPlay();
        });

        playButton.addEventListener("click", (event) => {
            event.preventDefault();
            playButton.classList.add("hidden");
            interactiveElementPlay();
        });

        if (options.includes("openControls")) toggleControls(instanceName);

        if (options.includes("noControls")) {
            controlsContainer.classList.add("hidden");
            controlsArrow.classList.add("hidden");
            interactiveContainer.classList.remove("border-b-0");
            interactiveContainer.classList.add("rounded-b-xl");
        }

        if (options.includes("autoPlay")) interactiveElementPlay();
    });
}

function extractAndEvaluateScripts(scripts) {
    window.interactiveElements = {};
    scripts.forEach((script) => {
        try {
            script.match(/class\s+(\w+)/g).forEach((classStr) => {
                const className = classStr.trim().substring(6);
                script += `\nwindow.interactiveElements.${className} = ${className};`;
            });
            eval(script);
        } catch (error) {
            console.error("Error evaluating script:", error);
        }
    });
}
