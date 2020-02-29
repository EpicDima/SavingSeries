const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
    const isDevelopment = argv.mode === 'production';
    return {
        entry: "./src/js/main.js",
        output: {
            filename: "main.js",
            path: path.resolve(__dirname, "dist"),
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./src/html/index.html",
                minify: isDevelopment ? {
                    collapseWhitespace: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true
                } : false
            }),
            new MiniCssExtractPlugin({
                filename: "style.css"
            }),
            new OptimizeCssAssetsPlugin(isDevelopment ? {
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
                    ],
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
            minimize: isDevelopment,
            minimizer: isDevelopment ? [
                new TerserPlugin()
            ] : []
        }
    };
};
