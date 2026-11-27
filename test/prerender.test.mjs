import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const cli = fileURLToPath(new URL("../bin/prerender.js", import.meta.url));
const execute = promisify(execFile);

async function makeFixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "bitsy-prerender-test-"));
    t.after(() => fs.rm(root, { recursive: true, force: true }));

    const src = path.join(root, "src");
    const dist = path.join(root, "dist");
    await Promise.all([fs.mkdir(src), fs.mkdir(dist)]);
    await fs.writeFile(path.join(dist, "old.txt"), "existing release");

    return { root, src, dist };
}

function prerender(src, dist, ...args) {
    return execute(process.execPath, [cli, `--src=${src}`, `--dist=${dist}`, ...args], { timeout: 15000 });
}

function writePage(src, name, body, waits = false) {
    const metadata = waits ? '<meta name="bitsy-prerender" content="wait">' : "";
    const html = `<!doctype html><html><head>${metadata}<title>Notes about BitsyJS</title></head><body>${body}</body></html>`;
    return fs.writeFile(path.join(src, name), html);
}

test("prerender refuses overlapping source and output paths without deleting input", async (t) => {
    const { root, src, dist } = await makeFixture(t);
    await writePage(src, "index.html", "Keep me");

    await assert.rejects(prerender(src, root, "--clean"), /--src and --dist must not overlap/);
    await assert.rejects(prerender(src, path.join(src, "new-output")), /--src and --dist must not overlap/);

    const alias = path.join(root, "alias");
    await fs.symlink(src, alias, "junction");
    await assert.rejects(
        prerender(src, path.join(alias, "new-output"), "--clean"),
        /--src and --dist must not overlap/,
    );
    assert.match(await fs.readFile(path.join(src, "index.html"), "utf8"), /Keep me/);
    assert.equal(await fs.readFile(path.join(dist, "old.txt"), "utf8"), "existing release");
});

test("prerender leaves existing clean output untouched if a later page times out", async (t) => {
    const { root, src, dist } = await makeFixture(t);
    await writePage(src, "a.html", "First page");
    await writePage(src, "z.html", "Missing render signal", true);

    await assert.rejects(prerender(src, dist, "--clean", "--timeout=1500"), /Timed out waiting for bitsy:rendered/);

    assert.deepEqual(await fs.readdir(dist), ["old.txt"]);
    assert.deepEqual((await fs.readdir(root)).sort(), ["dist", "src"]);
});

test("prerender captures plain pages and only waits for explicitly opted-in pages", async (t) => {
    const { src, dist } = await makeFixture(t);
    await writePage(src, "plain.html", "No script here");
    await writePage(
        src,
        "ready.html",
        `
        <p id="result">Before</p>
        <script>
            setTimeout(() => {
                document.getElementById("result").textContent = "Rendered";
                document.dispatchEvent(new Event("bitsy:rendered"));
            }, 1000);
        </script>`,
        true,
    );
    await fs.writeFile(path.join(src, "style.css"), "p { color: blue; }");

    await prerender(src, dist, "--clean", "--timeout=2000");

    assert.deepEqual((await fs.readdir(dist)).sort(), ["plain.html", "ready.html", "style.css"]);
    assert.match(await fs.readFile(path.join(dist, "plain.html"), "utf8"), /No script here/);
    assert.match(await fs.readFile(path.join(dist, "ready.html"), "utf8"), /<p id="result">Rendered<\/p>/);
    assert.equal(await fs.readFile(path.join(dist, "style.css"), "utf8"), "p { color: blue; }");
});
