<p align="center">
    <img src="https://raw.githubusercontent.com/im4aLL/bitsy-js/main/docs/assets/mark.svg" alt="" width="72" height="57" />
</p>

<h1 align="center">BitsyJS</h1>

A tiny, dependency-free, HTML-first view library. It adds data binding, signals, loops, conditions, fragments, events, remote data, and form validation to markup you already render. About 30.5 kB minified, 9.2 kB gzipped, no build step.

Docs, guides, and live examples: [bitsyjs.habibhadi.com](https://bitsyjs.habibhadi.com).

BitsyJS reads attributes and tags directly from the DOM and enhances the page after load. There is no virtual DOM, no component compiler, no runtime dependency, and no required build step.

## Install

```bash
npm install @im4all/bitsy-js
```

```js
import { BitsyJS } from "@im4all/bitsy-js";
```

Or load it straight from a CDN. No bundler needed:

```html
<script type="module">
    import { BitsyJS } from "https://unpkg.com/@im4all/bitsy-js/dist/bitsy.min.js";

    const bitsy = new BitsyJS();
    await bitsy.run();
</script>
```

TypeScript declarations are included.

## Why it is created

The world didn't need another JS library. I just wanted to include a damn HTML file.

Sometimes I just want to make a quick HTML page. Change a line, upload the file over FTP, done. Yes, FTP. I know what year it is. I got tired of running a build every time I touched a page. If all I did was fix a typo, I don't need my laptop or a build server to make an event out of it.

The first thing I wanted was to include one HTML file in another, like PHP's include. Plain HTML doesn't have that. Then I wanted to declare a JavaScript variable and use it in my markup, loop over a list, validate a form, and make an HTTP request. All small things. Somehow I kept ending up with either a full framework or three libraries in a trench coat.

There are other libraries that don't need a build step. Some felt more complicated than the page I was trying to make, and I often needed to add another library anyway. I still have a soft spot for jQuery. Being able to drop in a script and get on with it was genuinely cool.

I use modern frameworks too. They're great when I'm building an app. But for docs, a quick presentation, or a landing page, I wanted to start with HTML and keep it that way. So I built BitsyJS. Even in the AI era, I wrote the code by hand because I wanted to think through what actually needed to be there and leave the rest out. I want to be able to come back in six months and still know how it works.

## Quick start

```html
<div b-data>
    <h1>{title}</h1>
    <p b-if="isLoggedIn">Welcome back, {user.name}</p>
    <p b-if="!isLoggedIn">Please sign in.</p>

    <ul>
        <li b-for="player of players">{_index}: {player.name} - {player.score}</li>
    </ul>
</div>
```

```js
import { BitsyJS } from "@im4all/bitsy-js";

const bitsy = new BitsyJS({
    data: {
        title: "Scoreboard",
        isLoggedIn: true,
        user: { name: "Ada" },
        players: [
            { name: "Alpha", score: 10 },
            { name: "Beta", score: 7 },
        ],
    },
});

bitsy.ready(() => console.log("rendered"));
await bitsy.run();
```

## Core directives

| Directive                     | Purpose                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `b-data="{ key: value }"`     | Local data scope. Placeholders use `{path.to.value}`.                          |
| `b-for="item of items"`       | Repeats an element per item. Provides `_index`, `_isFirst`, `_isLast`.          |
| `b-if="expression"`           | Shows or hides an element with `display: none`.                                |
| `b-view src="./partial.html"` | Fetches and inlines an HTML fragment.                                          |
| `b-container`                 | Groups markup and removes the wrapper after rendering.                         |
| `b-js="expression"`           | Evaluates an expression and writes the result as HTML.                         |

Events use `data-b-event="click"` plus effect attributes such as `-html`, `-toggle-class`, `-remote`, and `-indicator`. Forms use `data-b-validate-form` and `data-b-form-ajax`. Full tables are in the [API reference](https://bitsyjs.habibhadi.com).

## Signals

Use signals for state that changes after `run()`:

```js
import { BitsyJS, computed, signal } from "@im4all/bitsy-js";

const count = signal(0);
const doubled = computed(() => count() * 2);
await new BitsyJS({ data: { count, doubled } }).run();
```

```html
<div b-data>
    <p>Count: {count()}. Doubled: {doubled()}.</p>
    <button type="button" b-on:click="count.update(n => n + 1)">+1</button>
</div>
```

Text and attribute bindings, `b-if`, and `b-js` update when the signals they read change. In handlers, `$event` is the DOM event and `$el` is the element that owns the handler. See the [signals demo](https://github.com/im4aLL/bitsy-js/blob/main/demo/signals.html).

## Pre-render

The package ships a `bitsy-prerender` CLI (Playwright based) for pages that need rendered HTML:

```bash
npm install -D playwright
npx playwright install chromium
npx bitsy-prerender --src=./site --dist=./dist --clean
```

## Custom tags and security

Every directive name can be overridden through the `tags` option, and form classes and messages through `validatorConfig`.

Directive expressions run through `new Function` with access to browser globals, and HTML values are inserted as markup. Only use expressions, fragments, and remote endpoints you trust.

## Development

```bash
npm install
npm run dev     # local server
npm run build   # dist/bitsy.min.js
npm test        # Playwright + Chromium
```

Runnable demos live in `demo/` and are linked from `index.html`. After changing the library, sync the docs bundle: `cp dist/bitsy.min.js docs/assets/bitsy.min.js`.

## License

MIT. See [LICENSE](https://github.com/im4aLL/bitsy-js/blob/main/LICENSE).
