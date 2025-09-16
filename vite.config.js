import {defineConfig} from "vite";
import {resolve} from "path";
import {globSync} from "glob";
import {minify} from "html-minifier-terser";

const htmlFiles = globSync(["./*.html"]).reduce((acc, file) => {
    const name = file.split("/").pop().split(".").shift();
    acc[name] = resolve(__dirname, file);
    return acc;
}, {});

// Custom plugin to find and minify all HTML files in the output bundle
// noinspection JSUnusedGlobalSymbols
const minifyHtmlInBundle = () => ({
    name: "minify-html-in-bundle",
    enforce: "post",
    async generateBundle(options, bundle) {
        const minifierOptions = {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
        };

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

export default defineConfig(({mode}) => {
    const isProduction = mode === "production";
    return {
        base: isProduction ? "/SavingSeries/" : "/",
        server: {
            open: true,
        },
        build: {
            rollupOptions: {
                input: htmlFiles,
            }
        },
        plugins: [
            isProduction && minifyHtmlInBundle(),
        ],
    }
});
