import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 * Released under the ${pkg.license} License
 */`;

const libraryBuild = {
    build: {
        outDir: "dist",
        emptyOutDir: true,
        minify: "oxc",
        lib: {
            entry: "lib/bitsy.js",
            formats: ["es"],
            fileName: () => "bitsy.min.js",
        },
        rolldownOptions: {
            output: {
                banner,
                minify: { compress: true, mangle: true, codegen: true },
                comments: { legal: true },
            },
        },
    },
};

const appBuild = {
    build: {
        outDir: "dist-demo",
        emptyOutDir: true,
    },
};

export default defineConfig(({ mode }) => ({
    ...(mode === "lib" ? libraryBuild : appBuild),
    fmt: {
        printWidth: 120,
        ignorePatterns: ["**/*.min.js"],
        overrides: [
            {
                files: ["docs/**/*.html"],
                options: { printWidth: 160 },
            },
        ],
    },
}));
