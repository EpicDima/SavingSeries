"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/filter.ts
var filterFileName = (fileName, filter) => {
  if (filter instanceof RegExp) {
    return filter.test(fileName);
  }
  if (typeof filter === "function") {
    return filter(fileName);
  }
  if (typeof filter === "string") {
    return fileName === filter;
  }
  return true;
};

// src/minify.ts
var import_html_minifier_terser = require("html-minifier-terser");
function getOptions(minify) {
  if (typeof minify === "boolean") {
    return {
      collapseWhitespace: minify,
      keepClosingSlash: minify,
      removeComments: minify,
      removeRedundantAttributes: minify,
      removeScriptTypeAttributes: minify,
      removeStyleLinkTypeAttributes: minify,
      removeEmptyAttributes: minify,
      useShortDoctype: minify,
      minifyCSS: minify,
      minifyJS: minify,
      minifyURLs: minify
    };
  }
  return minify;
}
async function minifyHtml(html, minifyFlag) {
  if (typeof minifyFlag === "boolean" && !minifyFlag)
    return html;
  const minifyOptions = getOptions(minifyFlag);
  return await (0, import_html_minifier_terser.minify)(html, minifyOptions);
}

// src/index.ts
function htmlMinifier(options = {}) {
  const { minify = true, filter } = options;
  return {
    name: "vite:html-minifier",
    enforce: "post",
    apply: "build",
    async transformIndexHtml(html, { filename }) {
      if (!filterFileName(filename, filter))
        return;
      return minifyHtml(html, minify);
    }
  };
}
var src_default = htmlMinifier;
