const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");


module.exports = (env, argv) => {
    const isProduction = argv.mode === "production";
    return {
        entry: "./src/js/main.js",
        output: {
            filename: "main.js",
            path: path.resolve(__dirname, "dist")
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./src/html/index.html",
                minify: isProduction ? {
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
            new CleanWebpackPlugin()
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
                },
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env"],
                            plugins: [
                                "@babel/plugin-proposal-class-properties",
                                "@babel/plugin-transform-runtime"
                            ]
                        }
                    }
                }
            ]
        },
        optimization: {
            minimize: isProduction,
            minimizer: isProduction ? [
                new TerserPlugin(),
                new CssMinimizerPlugin(
                    {
                        test: /\.css$/g,
                        minify: CssMinimizerPlugin.cssnanoMinify,
                        minimizerOptions: {
                            preset: [
                                "default",
                                {
                                    discardComments: {removeAll: true},
                                },
                            ],
                        },
                    }
                )
            ] : []
        }
    };
};
