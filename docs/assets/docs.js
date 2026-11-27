(function () {
    "use strict";

    const THEME_KEY = "bitsy-docs-theme";
    const LIGHT_CODE_THEME = "hljs-theme-light";
    const DARK_CODE_THEME = "hljs-theme-dark";

    function prefersDark() {
        try {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === "dark" || stored === "light") {
                return stored === "dark";
            }
        } catch {}

        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function applyTheme(dark, persist) {
        const root = document.documentElement;

        root.classList.toggle("theme-dark", dark);
        root.classList.toggle("theme-light", !dark);
        root.style.colorScheme = dark ? "dark" : "light";

        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            button.setAttribute("aria-pressed", String(dark));
            button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
            button.title = dark ? "Switch to light theme" : "Switch to dark theme";
        });

        const lightTheme = document.getElementById(LIGHT_CODE_THEME);
        const darkTheme = document.getElementById(DARK_CODE_THEME);

        if (lightTheme && darkTheme) {
            lightTheme.disabled = dark;
            darkTheme.disabled = !dark;
        }

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute("content", dark ? "#0b0e13" : "#ffffff");
        }

        if (persist) {
            try {
                localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
            } catch {}
        }
    }

    function setupTheme() {
        applyTheme(prefersDark(), false);
    }

    function bindThemeToggles() {
        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            if (button.dataset.themeReady === "true") {
                return;
            }

            button.dataset.themeReady = "true";
            button.addEventListener("click", function () {
                applyTheme(!document.documentElement.classList.contains("theme-dark"), true);
            });
        });

        applyTheme(document.documentElement.classList.contains("theme-dark"), false);
    }

    function announce(message) {
        const region = document.getElementById("docs-live");
        if (region) {
            region.textContent = "";
            window.setTimeout(function () {
                region.textContent = message;
            }, 40);
        }
    }

    function copyText(text) {
        return navigator.clipboard && window.isSecureContext
            ? navigator.clipboard.writeText(text).catch(function () {
                  return legacyCopy(text);
              })
            : legacyCopy(text);
    }

    function legacyCopy(text) {
        return new Promise(function (resolve, reject) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();

            try {
                const copied = document.execCommand("copy");
                document.body.removeChild(textarea);

                if (copied) {
                    resolve();
                } else {
                    reject(new Error("copy failed"));
                }
            } catch (error) {
                document.body.removeChild(textarea);
                reject(error);
            }
        });
    }

    function markCopied(button) {
        const label = button.querySelector("[data-copy-label]");
        const original = label ? label.textContent : "";

        button.classList.add("is-copied");
        if (label) {
            label.textContent = "Copied";
        }

        window.setTimeout(function () {
            button.classList.remove("is-copied");
            if (label) {
                label.textContent = original;
            }
        }, 1600);
    }

    function setupCopyButtons() {
        document.querySelectorAll("[data-copy-target]").forEach(function (button) {
            button.addEventListener("click", function () {
                const target = document.getElementById(button.getAttribute("data-copy-target"));
                if (!target) {
                    return;
                }

                copyText(target.textContent.trim())
                    .then(function () {
                        markCopied(button);
                        announce("CDN URL copied to the clipboard");
                    })
                    .catch(function () {
                        announce("Could not copy the CDN URL");
                    });
            });
        });

        document.querySelectorAll("[data-copy-code]").forEach(function (button) {
            button.addEventListener("click", function () {
                const frame = button.closest(".docs-code, .docs-workbench-code");
                const code = frame ? frame.querySelector("code") : null;
                if (!code) {
                    return;
                }

                copyText(code.textContent.trim())
                    .then(function () {
                        markCopied(button);
                        announce("Code copied to the clipboard");
                    })
                    .catch(function () {
                        announce("Could not copy the code");
                    });
            });
        });
    }

    function setupMobileMenu() {
        const button = document.querySelector("[data-menu-button]");
        const panel = document.getElementById("docs-mobile-nav");

        if (!button || !panel || button.dataset.menuReady === "true") {
            return;
        }

        button.dataset.menuReady = "true";

        function setOpen(open) {
            panel.hidden = !open;
            button.setAttribute("aria-expanded", String(open));
            button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        button.addEventListener("click", function () {
            setOpen(panel.hidden);
        });

        panel.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !panel.hidden) {
                setOpen(false);
                button.focus();
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth >= 860 && !panel.hidden) {
                setOpen(false);
            }
        });
    }

    function setupSearchShortcut() {
        document.addEventListener("keydown", function (event) {
            const input = document.querySelector("[data-doc-search]");
            if (!input) {
                return;
            }

            if (event.key === "Escape" && event.target === input) {
                input.value = "";
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.blur();
                return;
            }

            const target = event.target;
            const typing =
                target instanceof HTMLElement &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable);

            if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                const details = input.closest("details");
                if (details && !details.open) {
                    details.open = true;
                }
                input.focus();
                input.select();
            }
        });
    }

    function setupBrowseLinks() {
        const browse = document.querySelector(".docs-browse");
        if (!browse || browse.dataset.browseReady === "true") {
            return;
        }

        browse.dataset.browseReady = "true";

        if (window.matchMedia("(max-width: 960px)").matches) {
            browse.removeAttribute("open");
        }

        browse.addEventListener("click", function (event) {
            if (event.target.closest("a") && window.innerWidth <= 960) {
                browse.open = false;
            }
        });
    }

    function setupScrollSpy() {
        const headings = Array.prototype.slice.call(document.querySelectorAll(".docs-prose h2[id]"));
        const links = Array.prototype.slice.call(document.querySelectorAll("[data-toc-link]"));

        if (headings.length === 0 || links.length === 0) {
            return;
        }

        function setActive(id) {
            links.forEach(function (link) {
                const active = link.getAttribute("href") === "#" + id;
                link.classList.toggle("is-active", active);
                if (active) {
                    link.setAttribute("aria-current", "true");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }

        function update() {
            const header = document.querySelector(".docs-header");
            const offset = (header ? header.getBoundingClientRect().bottom : 0) + 24;
            let current = headings[0].id;

            headings.forEach(function (heading) {
                if (heading.getBoundingClientRect().top <= offset + 4) {
                    current = heading.id;
                }
            });

            setActive(current);
        }

        let frame = 0;
        function onScroll() {
            if (frame) {
                return;
            }
            frame = window.requestAnimationFrame(function () {
                frame = 0;
                update();
            });
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        update();
    }

    function setupDemoTabs() {
        const tabs = Array.prototype.slice.call(document.querySelectorAll("[data-demo-tab]"));

        if (tabs.length === 0) {
            return;
        }

        function activate(next) {
            tabs.forEach(function (tab) {
                const selected = tab === next;
                const panel = document.getElementById(tab.getAttribute("aria-controls"));

                tab.setAttribute("aria-selected", String(selected));
                tab.tabIndex = selected ? 0 : -1;

                if (panel) {
                    panel.hidden = !selected;
                }
            });
        }

        tabs.forEach(function (tab, index) {
            tab.addEventListener("click", function () {
                activate(tab);
            });

            tab.addEventListener("keydown", function (event) {
                const last = tabs.length - 1;
                let nextIndex = null;

                if (event.key === "ArrowRight") {
                    nextIndex = index === last ? 0 : index + 1;
                } else if (event.key === "ArrowLeft") {
                    nextIndex = index === 0 ? last : index - 1;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = last;
                }

                if (nextIndex === null) {
                    return;
                }

                event.preventDefault();
                activate(tabs[nextIndex]);
                tabs[nextIndex].focus();
            });
        });
    }

    function setupCodeFrames() {
        const labels = {
            bash: "Terminal",
            sh: "Terminal",
            css: "CSS",
            html: "HTML",
            js: "JavaScript",
            javascript: "JavaScript",
            json: "JSON",
            text: "Text",
        };

        const copyIcon = '<i class="iconoir-copy docs-copy-copy docs-icon" aria-hidden="true"></i>';
        const checkIcon = '<i class="iconoir-check docs-copy-check docs-icon" aria-hidden="true"></i>';

        document.querySelectorAll(".docs-prose pre").forEach(function (pre) {
            if (pre.closest(".docs-code, .docs-codepair, .docs-workbench-code")) {
                return;
            }

            const code = pre.querySelector("code");
            const languageClass = code
                ? Array.prototype.find.call(code.classList, function (name) {
                      return name.indexOf("language-") === 0;
                  })
                : null;
            const language = languageClass ? languageClass.slice("language-".length) : "";
            const label = pre.getAttribute("data-file") || labels[language] || "Code";

            const frame = document.createElement("div");
            frame.className = "docs-code";

            const bar = document.createElement("div");
            bar.className = "docs-code-bar";

            const file = document.createElement("span");
            file.className = "docs-code-file";
            file.textContent = label;
            bar.appendChild(file);

            const button = document.createElement("button");
            button.className = "docs-code-copy";
            button.type = "button";
            button.setAttribute("data-copy-code", "");
            button.innerHTML = copyIcon + checkIcon + "<span data-copy-label>Copy</span>";
            bar.appendChild(button);

            frame.appendChild(bar);
            pre.replaceWith(frame);
            frame.appendChild(pre);
        });
    }

    function setupHighlighting() {
        if (window.hljs && typeof window.hljs.highlightAll === "function") {
            window.hljs.highlightAll();
        }
    }

    function initShell() {
        bindThemeToggles();
        setupMobileMenu();
        setupBrowseLinks();
    }

    setupTheme();
    setupCodeFrames();
    setupHighlighting();
    setupCopyButtons();
    setupDemoTabs();
    setupSearchShortcut();
    setupScrollSpy();

    initShell();
    document.addEventListener("bitsy:rendered", initShell);
})();
