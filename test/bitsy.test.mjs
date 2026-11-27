import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let server;
let browser;
let baseUrl;
let lastEchoHeaders = null;

const pages = new Map();

function renderPage(body, settings = "") {
    return `<!DOCTYPE html>
<html>
<body>
${body}
<script type="module">
import { BitsyJS } from "/lib/bitsy.js";

window.bitsy = new BitsyJS(${settings});
await window.bitsy.run();
window.__ready = true;
</script>
</body>
</html>`;
}

async function openPage(name) {
    const page = await browser.newPage();
    const errors = [];

    page.on("pageerror", (error) => {
        errors.push(error.message);
    });

    await page.goto(`${baseUrl}/test/${name}`);
    await page.waitForFunction(() => window.__ready === true);

    return { page, errors };
}

function wait(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

before(async () => {
    pages.set(
        "fallback",
        renderPage(`
            <div b-data="{ user: {} }">
                <p id="text">{user.name.first}</p>
                <p id="attr" title="{user.profile.url}">attribute</p>
            </div>
        `),
    );

    pages.set(
        "strings",
        renderPage(`
            <div b-data="{ label: 'node.0' }">
                <p id="label">{label}</p>
                <p id="condition" b-if="'node.0' === label">visible</p>
            </div>
        `),
    );

    pages.set(
        "remote",
        renderPage(`
            <button
                id="send"
                type="button"
                data-b-event="click"
                data-b-event-remote="/echo"
                data-b-event-remote-method="POST"
                data-b-event-remote-payload='{"name":"Ada"}'
                data-b-event-target="#out"
            >Send</button>
            <div id="out"></div>
        `),
    );

    pages.set(
        "remote-failure",
        renderPage(`
            <button
                id="fail"
                type="button"
                data-b-event="click"
                data-b-event-remote="/fail"
                data-b-event-target="#out"
                data-b-event-indicator="is--loading"
            >Fail</button>
            <div id="out"></div>
        `),
    );

    pages.set(
        "validation-classes",
        renderPage(
            `
            <form id="form" action="/noop" method="get" data-b-validate-form="true">
                <div id="wrap">
                    <input id="email" name="email" data-b-validate="required" />
                </div>
                <small data-b-validate-message="email"></small>
                <button type="submit">Validate</button>
            </form>
        `,
            `{ validatorConfig: { addClassToField: false, addClassToParent: false } }`,
        ),
    );

    pages.set(
        "ajax-failure",
        renderPage(`
            <form
                id="form"
                action="/fail-form"
                method="post"
                data-b-form-ajax="true"
                data-b-form-ajax-target="#out"
                data-b-form-remove-on-submit="true"
            >
                <input name="name" value="Ada" />
                <button type="submit">Save</button>
            </form>
            <div id="out"></div>
        `),
    );

    pages.set(
        "template",
        renderPage(`
            <button id="one" data-b-event="click" data-b-event-remote="/data/one" data-b-event-target="#out">One</button>
            <button id="two" data-b-event="click" data-b-event-remote="/data/two" data-b-event-target="#out">Two</button>
            <div id="out" data-b-use-template="#row-template"></div>
            <template id="row-template" data-b-remote-data="response">
                <p class="value">{response.value}</p>
            </template>
        `),
    );

    pages.set(
        "pattern-colon",
        renderPage(`
            <form
                id="form"
                action="/ok"
                method="post"
                data-b-form-ajax="true"
                data-b-form-ajax-target="#out"
            >
                <input id="code" name="code" value="abc:12" data-b-validate="pattern:^[a-z]+:[0-9]+$" />
                <small data-b-validate-message="code"></small>
                <button type="submit">Submit</button>
            </form>
            <div id="out"></div>
        `),
    );

    server = http.createServer(async (req, res) => {
        const requestUrl = new URL(req.url, "http://127.0.0.1");

        if (requestUrl.pathname.startsWith("/test/")) {
            const name = requestUrl.pathname.slice("/test/".length);
            const html = pages.get(name);

            if (!html) {
                res.writeHead(404);
                res.end("Not found");
                return;
            }

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(html);
            return;
        }

        if (requestUrl.pathname.startsWith("/lib/")) {
            const filePath = path.resolve(root, "." + requestUrl.pathname);

            if (filePath !== root && !filePath.startsWith(root + path.sep)) {
                res.writeHead(403);
                res.end("Forbidden");
                return;
            }

            try {
                const body = await readFile(filePath);
                res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
                res.end(body);
            } catch {
                res.writeHead(404);
                res.end("Not found");
            }
            return;
        }

        if (requestUrl.pathname === "/echo") {
            lastEchoHeaders = req.headers["content-type"] || null;
            req.resume();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        if (requestUrl.pathname === "/fail") {
            await wait(100);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("remote failure");
            return;
        }

        if (requestUrl.pathname === "/fail-form") {
            await wait(100);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("form failure");
            return;
        }

        if (requestUrl.pathname === "/data/one") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ value: "one" }));
            return;
        }

        if (requestUrl.pathname === "/data/two") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ value: "two" }));
            return;
        }

        if (requestUrl.pathname === "/ok") {
            req.resume();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("ok");
    });

    await new Promise((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });

    baseUrl = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch();
});

after(async () => {
    await browser?.close();
    server?.close();
});

test("missing placeholder paths stay literal", async (t) => {
    const { page, errors } = await openPage("fallback");
    t.after(() => page.close());

    assert.equal(await page.textContent("#text"), "{user.name.first}");
    assert.equal(await page.getAttribute("#attr", "title"), "{user.profile.url}");
    assert.deepEqual(errors, []);
});

test("numeric path normalization does not rewrite string literals", async (t) => {
    const { page, errors } = await openPage("strings");
    t.after(() => page.close());

    assert.equal(await page.textContent("#label"), "node.0");
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector("#condition")).display), "none");
    assert.deepEqual(errors, []);
});

test("remote JSON payloads send the JSON content type", async (t) => {
    const { page, errors } = await openPage("remote");
    t.after(() => page.close());

    await page.click("#send");
    await page.waitForFunction(() => document.querySelector("#out").textContent.includes("ok"));

    assert.match(lastEchoHeaders || "", /^application\/json/);
    assert.deepEqual(errors, []);
});

test("remote failures clear the loading class", async (t) => {
    const { page, errors } = await openPage("remote-failure");
    t.after(() => page.close());

    await page.click("#fail");
    await page.waitForFunction(() => document.querySelector("#out").classList.contains("is--loading"));
    await page.waitForFunction(() => !document.querySelector("#out").classList.contains("is--loading"));

    assert.equal(await page.textContent("#out"), "");
    assert.deepEqual(errors, []);
});

test("validation classes can be disabled for field and parent", async (t) => {
    const { page, errors } = await openPage("validation-classes");
    t.after(() => page.close());

    await page.click("button[type=submit]");
    await page.waitForTimeout(50);

    const classes = await page.evaluate(() => ({
        field: [...document.querySelector("#email").classList],
        parent: [...document.querySelector("#wrap").classList],
    }));

    assert.equal(classes.field.includes("error"), false);
    assert.equal(classes.field.includes("success"), false);
    assert.equal(classes.parent.includes("error"), false);
    assert.equal(classes.parent.includes("success"), false);
    assert.deepEqual(errors, []);
});

test("AJAX form failures keep the form and leave the target unchanged", async (t) => {
    const { page, errors } = await openPage("ajax-failure");
    t.after(() => page.close());

    await page.click("#form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#form button[type=submit]").disabled);
    await page.waitForFunction(() => !document.querySelector("#form button[type=submit]").disabled);

    const result = await page.evaluate(() => ({
        formExists: Boolean(document.querySelector("#form")),
        target: document.querySelector("#out").textContent,
    }));

    assert.equal(result.formExists, true);
    assert.equal(result.target, "");
    assert.deepEqual(errors, []);
});

test("AJAX forms suppress concurrent submits and restore only enabled controls", async (t) => {
    const { page, errors } = await openPage("ajax-failure");
    t.after(() => page.close());

    const pending = await page.evaluate(() => {
        const form = document.querySelector("#form");
        form.removeAttribute("data-b-form-remove-on-submit");
        form.innerHTML = '<button id="save">Save</button><button id="locked" type="submit" disabled>Locked</button>';
        document
            .querySelector("#out")
            .insertAdjacentHTML("beforebegin", '<button id="external" form="form">Save too</button>');
        const save = document.querySelector("#save");
        const external = document.querySelector("#external");
        const requests = [];
        window.testRequests = requests;
        window.fetch = (_, options) => new Promise((resolve) => requests.push({ method: options.method, resolve }));

        save.click();
        save.click();
        form.requestSubmit();
        external.click();

        return { methods: requests.map(({ method }) => method), disabled: save.disabled && external.disabled };
    });

    assert.deepEqual(pending, { methods: ["POST"], disabled: true });
    await page.evaluate(() => window.testRequests[0].resolve(new Response("Saved")));
    await page.waitForFunction(() => document.querySelector("#out").textContent === "Saved");

    assert.equal(await page.locator("#save").isEnabled(), true);
    assert.equal(await page.locator("#external").isEnabled(), true);
    assert.equal(await page.locator("#locked").isDisabled(), true);

    await page.click("#save");
    assert.equal(await page.evaluate(() => window.testRequests.length), 2);
    await page.evaluate(() => window.testRequests[1].resolve(new Response("Saved again")));
    await page.waitForFunction(() => document.querySelector("#out").textContent === "Saved again");
    assert.deepEqual(errors, []);
});

test("templates start from the original markup on every render", async (t) => {
    const { page, errors } = await openPage("template");
    t.after(() => page.close());

    await page.click("#one");
    await page.waitForFunction(() => document.querySelector(".value")?.textContent === "one");

    await page.click("#two");
    await page.waitForFunction(() => document.querySelector(".value")?.textContent === "two");

    assert.deepEqual(errors, []);
});

test("pattern rules may contain colons", async (t) => {
    const { page, errors } = await openPage("pattern-colon");
    t.after(() => page.close());

    await page.click("#form button[type=submit]");
    await page.waitForFunction(() => document.querySelector("#out").textContent.includes("ok"));

    const classes = await page.evaluate(() => [...document.querySelector("#code").classList]);

    assert.equal(classes.includes("error"), false);
    assert.deepEqual(errors, []);
});
