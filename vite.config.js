import {defineConfig} from "vite";
import {resolve} from "path";
import {readFile} from "fs/promises";
import {globSync} from "glob";
import {minify} from "html-minifier-terser";

const htmlFiles = globSync(["./*.html"]).reduce((acc, file) => {
    const name = file.split("/").pop().split(".").shift();
    acc[name] = resolve(import.meta.dirname, file);
    return acc;
}, {});

const minifierOptions = {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
};

// Custom plugin to find and minify all HTML files in the output bundle
// noinspection JSUnusedGlobalSymbols
const minifyHtmlInBundle = () => ({
    name: "minify-html-in-bundle",
    enforce: "post",
    async generateBundle(options, bundle) {
        for (const fileName in bundle) {
            if (fileName.endsWith(".html")) {
                const chunk = bundle[fileName];
                if (chunk.type === "asset") {
                    const source = Buffer.isBuffer(chunk.source)
                        ? chunk.source.toString("utf-8")
                        : chunk.source;
                    chunk.source = await minify(source, minifierOptions);
                }
            }
        }
    },
});

// noinspection JSUnusedGlobalSymbols
const minifyRawHtml = () => ({
    name: "minify-raw-html",
    enforce: "pre", // иначе ?raw загрузит встроенный плагин Vite
    async load(id) {
        if (id.endsWith(".html?raw")) {
            const source = await readFile(id.slice(0, -"?raw".length), "utf-8");
            return `export default ${JSON.stringify(await minify(source, minifierOptions))};`;
        }
    },
});

export default defineConfig(({mode}) => {
    const isProduction = mode === "production";
    return {
        base: "/",
        server: {
            open: true,
        },
        build: {
            rollupOptions: {
                input: htmlFiles,
            }
        },
        plugins: [
            isProduction && minifyRawHtml(),
            isProduction && minifyHtmlInBundle(),
        ],
    }
});
