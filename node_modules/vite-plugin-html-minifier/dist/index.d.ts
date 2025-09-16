import { Plugin } from 'vite';
import { Options } from 'html-minifier-terser';

type MinifyOptions = Options;
type Filter = RegExp | string | ((fileName: string) => boolean);
type UserOptions = {
    minify?: boolean | MinifyOptions;
    filter?: Filter;
};

declare function htmlMinifier(options?: UserOptions): Plugin;

export { htmlMinifier as default };
