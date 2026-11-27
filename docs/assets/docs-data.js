export const version = "1.0.0";
export const gzip = "9.2";
export const minified = "30.5";
export const dependencies = 0;

export const tagline = `v${version} - MIT - ${gzip} kB gzipped`;

export const stats = [
    { value: `${minified} kB`, label: "minified" },
    { value: `${gzip} kB`, label: "gzipped" },
    { value: `${dependencies}`, label: "dependencies" },
];

export const meta = [
    { label: `v${version}`, accent: true },
    { label: "ES module" },
    { label: `${dependencies} dependencies` },
    { label: `${gzip} kB gzipped` },
];

export const cdn = `https://cdn.jsdelivr.net/npm/@im4all/bitsy-js@${version}/dist/bitsy.min.js`;

export const groups = [
    {
        id: "getting-started",
        label: "Getting started",
        items: [
            {
                key: "getting-started/introduction",
                title: "Introduction",
                keywords:
                    "introduction overview what it is progressive enhancement view layer directives what bitsyjs is, when it fits, and the directives it adds to html that is already on the page.",
            },
            {
                key: "getting-started/installation",
                title: "Installation",
                keywords:
                    "installation install npm cdn module dist package setup install bitsyjs from npm or a cdn, load the es module, and choose the right entry point for your setup.",
            },
            {
                key: "getting-started/quick-start",
                title: "Quick start",
                keywords:
                    "quick start quick start first render run data signals loop condition render an interactive bitsyjs page in three steps: load the module, describe the data, and call run().",
            },
            {
                key: "getting-started/comparison",
                title: "Comparison",
                keywords:
                    "compare alternatives no build html fragments @github/include-fragment-element h-include web fragments alpine.js alpinejs htmx petite-vue datastar unpoly stimulus hyperscript preact htm vanjs lit mithril arrowjs page.js",
            },
        ],
    },
    {
        id: "features",
        label: "Features",
        items: [
            {
                key: "features/data-binding",
                title: "Data binding",
                keywords:
                    "data binding b-data placeholders bind values attributes html missing null dot path array index render placeholders, dot paths, array indexes, attribute values and html values from a b-data scope.",
            },
            {
                key: "features/scoping",
                title: "Scoping",
                keywords:
                    "scoping scope global local b-data loop merge override sibling nearest how global data, b-data scopes and loop scopes combine, and which scope each directive reads.",
            },
            {
                key: "features/for-loops",
                title: "Loops",
                keywords:
                    "loops b-for loop repeat array list item index first last reactive repeat an element for every item in an array with b-for, including loop metadata, nested fields and reactive lists.",
            },
            {
                key: "features/conditionals",
                title: "Conditionals",
                keywords:
                    "conditionals b-if condition show hide display none boolean expression show and hide elements with b-if expressions, including loop metadata, signals and conditional containers.",
            },
            {
                key: "features/raw-js",
                title: "Raw JavaScript",
                keywords:
                    "raw javascript b-js raw javascript expression innerhtml compute evaluate an expression and write the result as html with b-js, including reactive signals and html strings.",
            },
            {
                key: "features/fragments",
                title: "Fragments",
                keywords:
                    "fragments b-view fragment partial fetch nested src html fetch and inline html partials with b-view, including nested fragments, scoped fragments and fragments in loops.",
            },
            {
                key: "features/containers",
                title: "Containers",
                keywords:
                    "containers b-container wrapper unwrap group attributes discard group markup with b-container and remove the wrapper after rendering, without adding an element to the final dom.",
            },
            {
                key: "features/signals",
                title: "Signals",
                keywords:
                    "signals signal computed effect reactivity set update subscribe peek derived use signal(), computed() and effect() for state that changes after run(), with fine-grained dom updates.",
            },
            {
                key: "features/events",
                title: "Event bindings",
                keywords:
                    "event bindings b-on click input submit event listener $event $el loop run javascript in the current scope on any dom event with b-on, including $event, $el and loop items.",
            },
            {
                key: "features/declarative-events",
                title: "Declarative events",
                keywords:
                    "declarative events data-b-event click html text add class remove toggle revert confirm change text, html or classes on click without writing a listener, using data-b-event attributes.",
            },
            {
                key: "features/remote-data",
                title: "Remote data and templates",
                keywords:
                    "remote data and templates remote fetch ajax json template target use-template remote-data keep-existing fetch a url from an event and render the response, with or without a template, including remote-data variables.",
            },
            {
                key: "features/forms",
                title: "Forms",
                keywords:
                    "forms form ajax submit fetch method get post put patch delete target remove indicator confirm submit forms with fetch instead of a page reload, choose a method, render the response and remove the form.",
            },
            {
                key: "features/validation",
                title: "Validation",
                keywords:
                    "validation validate required email min max length pattern date time number same message classes validate fields on submit with data-b-validate rules, messages, error classes and configurable text.",
            },
            {
                key: "features/custom-tags",
                title: "Custom tags",
                keywords:
                    "custom tags tags custom rename settings directives namespace rename directives through the tags setting and keep every default you do not override.",
            },
        ],
    },
    {
        id: "reference",
        label: "Reference",
        items: [
            {
                key: "reference/lifecycle",
                title: "Lifecycle",
                keywords:
                    "lifecycle lifecycle run rendered ready on event order async prerender the order run() works in, the rendered event, ready() callbacks and listeners registered after rendering.",
            },
            {
                key: "reference/api",
                title: "API reference",
                keywords:
                    "api reference api reference constructor settings tags data validatorconfig run on ready signal computed effect issignal exports the bitsyjs constructor, its settings, run/on/ready methods, and the signal, computed, effect and issignal exports.",
            },
            {
                key: "reference/security",
                title: "Security",
                keywords:
                    "security security trust xss new function csp unsafe-eval sanitize remote fragments bitsyjs evaluates expressions and inserts html, so trust, sanitization and csp matter. here is the model.",
            },
        ],
    },
];
