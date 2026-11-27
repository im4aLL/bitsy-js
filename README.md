<p align="center">
    <img src="https://raw.githubusercontent.com/im4aLL/bitsy-js/main/docs/assets/mark.svg" alt="" width="72" height="57" />
</p>

<h1 align="center">BitsyJS</h1>

A tiny, dependency-free, HTML-first view library for adding declarative data binding, reactive signals, loops, conditions, fragments, events, remote data, and form validation to markup you already render. About 30.5 kB minified and 9.2 kB gzipped.

See the [BitsyJS documentation](https://bitsyjs.habibhadi.com) for guides, live examples, and the API reference.

## What it is

BitsyJS enhances existing HTML after the page loads. It reads attributes and tags directly from the DOM and fills in data, repeats blocks, shows or hides elements, loads fragments, wires events, fetches remote data, and validates forms. There is no virtual DOM, component compiler, runtime dependency, or required build step for consumers.

It is built for HTML produced by server-side apps, static site generators, or hand-written pages.

## Why BitsyJS

- Keep the HTML you already have. No separate template language.
- Avoid a build step. Import from npm or a CDN and call `run()`.
- Stay declarative. Directives are ordinary HTML attributes.
- Render once by default. Use [signals](#signals-and-reactivity) where the page needs to respond to changes.
- Reuse server partials with `b-view` fragments.
- Improve pages progressively. If JavaScript fails, the original markup remains.

BitsyJS is not a replacement for React, Vue, or Svelte in highly interactive applications.

## Install

### npm

```bash
npm install @im4all/bitsy-js
```

```js
import { BitsyJS } from "@im4all/bitsy-js";
```

TypeScript declarations are included in the package.

### CDN

```html
<script type="module">
    import { BitsyJS } from "https://unpkg.com/@im4all/bitsy-js/dist/bitsy.min.js";

    const bitsy = new BitsyJS();
    await bitsy.run();
</script>
```

The same build is available from jsDelivr: `https://cdn.jsdelivr.net/npm/@im4all/bitsy-js/dist/bitsy.min.js`.

### Pre-render

The package includes a `bitsy-prerender` CLI. It uses Playwright to render pages and save the resulting HTML. Playwright and Chromium are not installed automatically:

```bash
npm install -D playwright
npx playwright install chromium
npx bitsy-prerender --src=./site --dist=./dist --clean
```

Add `<meta name="bitsy-prerender" content="wait">` to the `<head>` of pages that must wait for BitsyJS to finish rendering. Plain pages are captured without waiting for a BitsyJS event. Keep the source and output directories separate. `--clean` replaces existing output only after all pages and assets are ready.

See the [pre-rendering guide](https://bitsyjs.habibhadi.com/reference/lifecycle.html#prerender) for flags and lifecycle details.

## Quick start

```html
<div b-data>
    <h1>{title}</h1>
    <p b-if="isLoggedIn">Welcome back, {user.name}</p>
    <p b-if="!isLoggedIn">Please sign in.</p>

    <ul>
        <li b-for="player of players">{_index}: {player.name} - {player.score}</li>
    </ul>

    <button data-b-event="click" data-b-event-toggle-class="active">Toggle</button>
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

## Signals and reactivity

Use `signal(initialValue)` for state that changes after `run()`, and `computed(() => ...)` for values derived from signals. Pass both in the constructor's `data` and call them as functions in your bindings to read their current values.

```html
<div b-data>
    <p>Count: {count()}. Doubled: {doubled()}.</p>
    <p b-if="count() === 0">Count is zero.</p>
    <button type="button" b-on:click="count.update(n => n + 1)">+1</button>
    <button type="button" b-on:click="count.set(0)">Reset</button>
</div>
```

```js
import { BitsyJS, computed, signal } from "@im4all/bitsy-js";

const count = signal(0);
const doubled = computed(() => count() * 2);
const bitsy = new BitsyJS({ data: { count, doubled } });
await bitsy.run();
```

- `state.set(value)` replaces a signal's value; `state.update(fn)` derives the next value from the current one. For arrays and objects, return a new value rather than mutating in place.
- Text and attribute bindings, `b-if`, and `b-js` update when the signals they read change. A reactive loop such as `b-for="item of items()"` rebuilds its rows when the list changes.
- `b-on:<event>` runs JavaScript in the current data scope, including the current loop item if there is one. `$event` is the DOM event and `$el` is the element that owns the handler. For example, `b-on:input="name.set($event.target.value)"` writes an input's value to a signal.
- For side effects outside markup, `effect(fn)` runs immediately and again when the signals it reads change. Call the returned function to stop it.

See the [signals demo](https://github.com/im4aLL/bitsy-js/blob/main/demo/signals.html) for live input, reactive attributes, and a todo list.

## Directives

| Directive                     | Purpose                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `b-data="{ key: value }"`     | Creates a local data scope. Placeholders use `{path.to.value}`.                             |
| `b-for="item of items"`       | Repeats an element for each item in an array. Provides `_index`, `_isFirst`, and `_isLast`. |
| `b-if="expression"`           | Shows or hides an element with `display: none`.                                             |
| `b-view src="./partial.html"` | Fetches and inlines an HTML fragment. Nested fragments are relative to their parent.        |
| `b-container`                 | Groups markup and removes the wrapper after rendering.                                      |
| `b-js="expression"`           | Evaluates an expression and writes the result as HTML.                                      |

`b-data` values are JavaScript object literals, not strict JSON. Nested objects and arrays work, and strings starting with `{` or `[` are parsed recursively. Values are rendered as HTML, and missing or `null` values leave the placeholder untouched.

## Events

| Attribute                                                                    | Purpose                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `data-b-event="click"`                                                       | Binds any DOM event.                                   |
| `data-b-event-html`, `-text`, `-add-class`, `-remove-class`, `-toggle-class` | Applies an effect on the event.                        |
| `data-b-event-revert="3s"`                                                   | Reverts supported effects after a delay.               |
| `data-b-event-remote="url"`                                                  | Fetches a URL and renders the response.                |
| `data-b-event-target="#id"`                                                  | Target element for rendered output.                    |
| `data-b-event-remote-method="POST"`, `-remote-payload="{...}"`               | Request method and JSON body for non-GET requests.     |
| `data-b-event-remote-content="json"`                                         | Set to another value to skip the JSON payload header.  |
| `data-b-event-indicator="is--loading"`                                       | Class added to the target while a remote request runs. |

Remote responses are parsed by content type (JSON, text/HTML, or blob). Without a template, JSON objects are rendered as pretty-printed text. Non-GET payloads are sent as JSON with `Content-Type: application/json`. A failed remote request logs an error and clears the loading class.

## Templates

Render remote or AJAX responses through a `<template>`:

```html
<div id="users" data-b-use-template="#users-tpl" data-b-keep-existing></div>

<template id="users-tpl" data-b-remote-data="users">
    <ul>
        <li b-for="user of users">{_index}. {user.name}</li>
    </ul>
</template>
```

| Attribute                    | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `data-b-use-template="#id"`  | Renders the response using the referenced template. |
| `data-b-remote-data="users"` | Names the response variable inside the template.    |
| `data-b-keep-existing`       | Appends instead of replacing existing content.      |

`b-for` and `b-if` work inside templates, and `{users.0.name}` style paths are supported. Templates are parsed from their original markup on every render, so the same template can render new responses.

## Forms

Validate and submit forms without extra JavaScript:

```html
<form
    action="/signup"
    method="post"
    data-b-validate-form="true"
    data-b-form-ajax="true"
    data-b-form-ajax-target="#result"
>
    <input name="email" data-b-validate="required|email" />
    <small data-b-validate-message="email"></small>
    <button type="submit">Sign up</button>
</form>
```

| Attribute                                  | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `data-b-validate-form="true"`              | Validates the form on submit.                  |
| `data-b-validate="required\|email\|min:5"` | Rules for a field, separated by `\|`.          |
| `data-b-validate-message="email"`          | Element that receives the field error text.    |
| `data-b-validate-error-message="..."`      | Overrides the message for one field.           |
| `data-b-form-ajax="true"`                  | Submits with `fetch` instead of a page reload. |
| `data-b-form-ajax-target="#id"`            | Target element for the AJAX response.          |
| `data-b-form-remove-on-submit="true"`      | Removes the form after a successful submit.    |

Available rules: `required`, `email`, `min:n`, `max:n`, `length:n`, `number`, `int`, `float`, `bool`, `same:field`, `pattern:regex`, `date`, `date:Y-m-d`, `jsDate`, and `time`. Invalid fields (and their parents) get the `error` class, valid ones get `success`. Customize classes and messages:

```js
new BitsyJS({
    validatorConfig: {
        classNames: { error: "is-invalid", success: "is-valid" },
        messages: { required: "This field is required" },
    },
});
```

AJAX forms support `get`, `post`, `put`, `patch`, and `delete`. GET parameters are appended to the URL; other methods send form data as the body. A non-2xx response logs an error and leaves the form in place.

Set `validatorConfig.addClassToField` or `validatorConfig.addClassToParent` to `false` to disable validation classes on the field or its parent.

## Scope and lifecycle

- Global data from the constructor is the base for every scope.
- `b-data` shallow-merges local keys over global data.
- `b-for` evaluates its list expression against global data and the nearest `b-data` scope.
- `b-if` and `b-js` use global data and the nearest `b-data` scope. `b-if` also sees loop metadata, which takes precedence.
- `run()` is async: it loads fragments, applies `b-data`, runs `b-for`, `b-if`, and `b-js`, unwraps containers, removes directive attributes, binds events, wires forms, then dispatches `bitsy.rendered`.
- `bitsy.on("rendered", callback)` and `bitsy.ready(callback)` run after rendering. Listeners added later run on the next render.

## Custom tags

Override individual default tags with the `tags` setting. Unspecified tags keep their defaults.

```js
new BitsyJS({
    tags: {
        dataBind: "x-data",
        forLoop: "x-for",
        view: "x-view",
        container: "x-container",
        conditionIf: "x-if",
        rawJs: "x-js",
        on: "x-on",
        event: "x-event",
        remoteData: "data-x-remote-data",
        useTemplate: "data-x-use-template",
        keepExisting: "data-x-keep-existing",
        validateForm: "data-x-validate-form",
        validateRule: "data-x-validate",
        validateMessage: "data-x-validate-message",
        validateErrorMessage: "data-x-validate-error-message",
        formAjax: "data-x-form-ajax",
        formAjaxRender: "data-x-form-ajax-target",
        formRemoveOnSubmit: "data-x-form-remove-on-submit",
    },
});
```

Renaming `on` changes `b-on:click` to `x-on:click`. Renaming `event` also renames its attributes, for example `data-x-event` and `data-x-event-toggle-class`.

## Security

BitsyJS evaluates JavaScript expressions in directives such as `b-data`, `b-if`, `b-js`, and `b-on:*` with `new Function`, and expressions can reach browser globals. HTML values, fragments, and remote responses are inserted into the DOM as markup. Only use directive expressions and remote endpoints you trust, and never pass untrusted user input into them.

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

`npm test` uses Playwright with Chromium. Runnable feature demos are in `demo/` and linked from `index.html`. The build output is `dist/bitsy.min.js`. After changing the library, sync the documentation bundle with `cp dist/bitsy.min.js docs/assets/bitsy.min.js`.

## License

MIT. See [LICENSE](https://github.com/im4aLL/bitsy-js/blob/main/LICENSE).
