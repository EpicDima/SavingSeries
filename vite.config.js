import {defineConfig} from "vite";
import minifier from "vite-plugin-html-minifier";
import {resolve} from 'path';
import {globSync} from 'glob';

const htmlFiles = globSync(['./*.html', './src/**/*.html']).reduce((acc, file) => {
    const name = file.split('/').pop().split('.').shift();
    acc[name] = resolve(__dirname, file);
    return acc;
}, {});

export default defineConfig({
    server: {
        open: true,
    },
    build: {
        rollupOptions: {
            input: htmlFiles,
        }
    },
    plugins: [
        minifier(),
    ],
});
