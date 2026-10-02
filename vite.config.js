import {defineConfig} from "vite";
import {readFile} from "fs/promises";
import {minify} from "html-minifier-terser";

const minifierOptions = {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
};

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
            port: 5391,
            // другой порт — другой origin и пустая IndexedDB
            strictPort: true,
        },
        build: {
            modulePreload: {polyfill: false},
        },
        plugins: [
            isProduction && minifyRawHtml(),
            isProduction && minifyHtmlInBundle(),
        ],
    }
});
