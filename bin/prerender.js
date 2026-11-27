#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { validateOutputPaths, writeOutput } from "./prerender-output.js";

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".cjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".wasm": "application/wasm",
};

function printUsage() {
    console.log(
        `
Usage:
  bitsy-prerender --src=<inputDir> --dist=<outputDir> [options]

Options:
  --src=<dir>        Source directory containing HTML files (required)
  --dist=<dir>       Destination directory for pre-rendered output (required)
  --entry=<files>    Comma-separated list of HTML files relative to src (optional)
  --timeout=<ms>     Navigation and render timeout per page (default: 10000)
  --clean            Replace the output directory after rendering succeeds
  --help             Show this help message

Add <meta name="bitsy-prerender" content="wait"> to pages that must wait for BitsyJS.
`.trim(),
    );
}

function parseArgs(argv) {
    const args = {
        src: null,
        dist: null,
        entry: null,
        timeout: 10000,
        clean: false,
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--help" || arg === "-h") {
            args.help = true;
        } else if (arg === "--clean") {
            args.clean = true;
        } else if (arg.startsWith("--src=")) {
            args.src = arg.slice("--src=".length);
        } else if (arg === "--src" && argv[i + 1]) {
            args.src = argv[++i];
        } else if (arg.startsWith("--dist=")) {
            args.dist = arg.slice("--dist=".length);
        } else if (arg === "--dist" && argv[i + 1]) {
            args.dist = argv[++i];
        } else if (arg.startsWith("--entry=")) {
            args.entry = arg
                .slice("--entry=".length)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        } else if (arg === "--entry" && argv[i + 1]) {
            args.entry = argv[++i]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        } else if (arg.startsWith("--timeout=")) {
            args.timeout = Number(arg.slice("--timeout=".length)) || 10000;
        } else if (arg === "--timeout" && argv[i + 1]) {
            args.timeout = Number(argv[++i]) || 10000;
        }
    }

    return args;
}

async function walkDir(dir, baseDir = dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walkDir(fullPath, baseDir)));
        } else if (entry.isFile()) {
            files.push(path.relative(baseDir, fullPath));
        }
    }

    return files;
}

function isHtmlFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === ".html" || ext === ".htm";
}

function isFullHtmlDocument(html) {
    return /<html[\s>]/i.test(html);
}

function createStaticServer(rootDir) {
    const server = http.createServer(async (req, res) => {
        try {
            const reqUrl = new URL(req.url, "http://127.0.0.1");
            const decodedPath = decodeURIComponent(reqUrl.pathname);
            let filePath = path.resolve(rootDir, "." + decodedPath);

            if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
                res.writeHead(403);
                res.end("Forbidden");
                return;
            }

            let stat = await fs.stat(filePath).catch(() => null);
            if (stat?.isDirectory()) {
                filePath = path.join(filePath, "index.html");
                stat = await fs.stat(filePath).catch(() => null);
            }

            if (!stat?.isFile()) {
                res.writeHead(404);
                res.end("Not Found");
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || "application/octet-stream";
            const content = await fs.readFile(filePath);

            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
        } catch (error) {
            res.writeHead(500);
            res.end(error.message);
        }
    });

    return new Promise((resolve, reject) => {
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            resolve({ server, port: address.port });
        });
    });
}

async function loadPlaywright() {
    try {
        return await import("playwright");
    } catch {
        console.error(
            'Error: "playwright" is required to run prerender.\n' +
                "Install it with:\n" +
                "  npm install -D playwright\n" +
                "  npx playwright install chromium",
        );
        process.exit(1);
    }
}

async function renderPage(page, pageUrl, timeout) {
    const errors = [];
    const onPageError = (error) => errors.push(error.message);
    const onConsole = (message) => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    };

    page.on("pageerror", onPageError);
    page.on("console", onConsole);

    try {
        await page.goto(pageUrl, { waitUntil: "networkidle", timeout });

        const html = await page.evaluate(async (timeoutMs) => {
            const waitsForRender = document.head.querySelector('meta[name="bitsy-prerender"][content="wait"]');
            if (waitsForRender && !window.__bitsyRendered) {
                let timer;
                try {
                    await Promise.race([
                        window.__bitsyReady,
                        new Promise((_, reject) => {
                            timer = setTimeout(
                                () => reject(new Error("Timed out waiting for bitsy:rendered")),
                                timeoutMs,
                            );
                        }),
                    ]);
                } finally {
                    clearTimeout(timer);
                }
            }

            const doctype = document.doctype ? new XMLSerializer().serializeToString(document.doctype) + "\n" : "";
            return doctype + document.documentElement.outerHTML;
        }, timeout);

        return { html, errors };
    } finally {
        page.off("pageerror", onPageError);
        page.off("console", onConsole);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
        printUsage();
        process.exit(0);
    }

    if (!args.src || !args.dist) {
        console.error("Error: Both --src and --dist are required.\n");
        printUsage();
        process.exit(1);
    }

    const cwd = process.cwd();
    const srcDir = path.resolve(cwd, args.src);
    const distDir = path.resolve(cwd, args.dist);

    const srcStat = await fs.stat(srcDir).catch(() => null);
    if (!srcStat?.isDirectory()) {
        throw new Error(`Source directory not found: ${srcDir}`);
    }

    await validateOutputPaths(srcDir, distDir, cwd, args.clean);

    const allFiles = (await walkDir(srcDir)).sort();
    const entryPages = [];
    const staticAssets = [];

    if (args.entry?.length > 0) {
        const entrySet = new Set(args.entry.map((f) => path.normalize(f)));
        for (const relPath of allFiles) {
            if (entrySet.has(path.normalize(relPath))) {
                entryPages.push(relPath);
            } else if (!isHtmlFile(relPath)) {
                staticAssets.push(relPath);
            }
        }
    } else {
        for (const relPath of allFiles) {
            if (isHtmlFile(relPath)) {
                const raw = await fs.readFile(path.join(srcDir, relPath), "utf8");
                if (isFullHtmlDocument(raw)) {
                    entryPages.push(relPath);
                }
            } else {
                staticAssets.push(relPath);
            }
        }
    }

    if (entryPages.length === 0) {
        console.warn(`No entry HTML pages found in ${srcDir}`);
        process.exit(0);
    }

    const isSrcInsideCwd = srcDir.startsWith(cwd + path.sep);
    const serverRoot = isSrcInsideCwd ? cwd : srcDir;
    const urlPrefix = isSrcInsideCwd ? "/" + path.relative(cwd, srcDir).split(path.sep).join("/") : "";

    const { chromium } = await loadPlaywright();
    const { server, port } = await createStaticServer(serverRoot);
    let browser;

    try {
        browser = await chromium.launch();
        const page = await browser.newPage();

        await page.addInitScript(() => {
            window.__bitsyReady = new Promise((resolve) => {
                document.addEventListener("bitsy:rendered", () => resolve(), { once: true });
            });
        });

        await writeOutput(distDir, args.clean, async (outputDir) => {
            for (const relPath of entryPages) {
                const urlPath = `${urlPrefix}/${relPath.split(path.sep).map(encodeURIComponent).join("/")}`;
                const { html, errors } = await renderPage(page, `http://127.0.0.1:${port}${urlPath}`, args.timeout);
                const outPath = path.join(outputDir, relPath);
                await fs.mkdir(path.dirname(outPath), { recursive: true });
                await fs.writeFile(outPath, html, "utf8");

                if (errors.length > 0) {
                    console.warn(`Warnings/errors on ${relPath}:`);
                    for (const error of errors) {
                        console.warn(`  - ${error}`);
                    }
                }
            }

            for (const relPath of staticAssets) {
                const distAsset = path.join(outputDir, relPath);
                await fs.mkdir(path.dirname(distAsset), { recursive: true });
                await fs.copyFile(path.join(srcDir, relPath), distAsset);
            }
        });

        for (const relPath of entryPages) {
            console.log(`Pre-rendered: ${relPath} -> ${path.relative(cwd, path.join(distDir, relPath))}`);
        }

        console.log(`\nDone. ${entryPages.length} page(s) pre-rendered, ${staticAssets.length} asset(s) copied.`);
    } finally {
        try {
            await browser?.close();
        } finally {
            server.close();
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
