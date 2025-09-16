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
import { minify as minifyFn } from "html-minifier-terser";
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
  return await minifyFn(html, minifyOptions);
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
export {
  src_default as default
};
