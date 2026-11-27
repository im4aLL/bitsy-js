(function () {
    "use strict";

    const THEME_KEY = "bitsy-docs-theme";

    try {
        const stored = localStorage.getItem(THEME_KEY);
        const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        const root = document.documentElement;

        root.classList.toggle("theme-dark", dark);
        root.classList.toggle("theme-light", !dark);
        root.style.colorScheme = dark ? "dark" : "light";

        if (dark) {
            document.getElementById("hljs-theme-light").disabled = true;
            document.getElementById("hljs-theme-dark").disabled = false;
        }
    } catch {}
})();
