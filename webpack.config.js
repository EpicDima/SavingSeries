const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");


module.exports = (env, argv) => {
    const params = {
        redirector: {
            entryKey: "./",
            entryPath: "./src/redirector/js/main.js",
            html: "./src/redirector/html/index.html"
        },
        v1: {
            entryKey: "v1/",
            entryPath: "./src/v1/js/main.js",
            html: "./src/v1/html/index.html"
        },
        v2: {
            entryKey: "v2/",
            entryPath: "./src/v2/js/main.js",
            html: "./src/v2/html/index.html"
        }
    };

    const isProduction = argv.mode === "production";
    // return [
    //     createOptions(isProduction, "./src/redirector/js/main.js", path.resolve(__dirname, "dist"), "./src/redirector/html/index.html"),
    //     createOptions(isProduction, "./src/v1/js/main.js", path.resolve(__dirname, "dist", "v1"), "./src/v1/html/index.html"),
    //     createOptions(isProduction, "./src/v2/js/main.js", path.resolve(__dirname, "dist", "v2"), "./src/v2/html/index.html")
    // ];

    return {
        entry: {
            "./": params.redirector.entryPath,
            "v1/": params.v1.entryPath,
            "v2/": params.v2.entryPath
        },
        output: {
            filename: "[name]main.js",
            path: path.resolve(__dirname, "dist")
        },
        plugins: [
            getHtmlPlugin(isProduction, params.redirector.entryKey, params.redirector.html),
            getHtmlPlugin(isProduction, params.v1.entryKey, params.v1.html),
            getHtmlPlugin(isProduction, params.v2.entryKey, params.v2.html),
            new MiniCssExtractPlugin({
                filename: "[name]style.css"
            }),
            new OptimizeCssAssetsPlugin(isProduction ? {
                assetNameRegExp: /\.css$/g,
                cssProcessor: require("cssnano"),
                cssProcessorPluginOptions: {
                    preset: [
                        "default",
                        {
                            discardComments: {
                                removeAll: true
                            }
                        }
                    ]
                },
                canPrint: true
            } : {
                assetNameRegExp: /\.optimize\.css$/g
            }),
            new CleanWebpackPlugin(),
            new webpack.ProvidePlugin({
                $: "jquery",
                jQuery: "jquery",
                "window.jQuery": "jquery"
            })
        ],
        module: {
            rules: [
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        "sass-loader"
                    ],
                }
            ]
        },
        optimization: {
            minimize: isProduction,
            minimizer: isProduction ? [
                new TerserPlugin()
            ] : []
        }
    };
};


function getHtmlPlugin(isProduction, chunk, template) {
    return new HtmlWebpackPlugin({
        filename: chunk + "index.html",
        template: template,
        chunks: [chunk],
        minify: isProduction ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true
        } : false
    });
}
