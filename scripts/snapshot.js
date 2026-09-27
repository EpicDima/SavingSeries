import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {parseArgs} from "node:util";
import {chromium} from "@playwright/test";
import {build, createServer, preview} from "vite";
import {openApp} from "../e2e/support/app.js";

const USAGE = `yarn snapshot <имя> [--width 1400] [--font-size 16] [--dev]

Снимает состояния интерфейса в .snapshots/<имя>: для каждого — computed-стили всех элементов (JSON)
и скриншот всей страницы. По умолчанию — production-сборка (как на сайте), --dev — dev-сервер без сборки.
Сравнение снимков — yarn snapshot:diff.`;

const SNAPSHOTS_DIR = ".snapshots";
const BUILD_DIR = `${SNAPSHOTS_DIR}/.dist`;
const PORT = 5393;
const TRANSITION_WAIT_MS = 350;

const {values: options, positionals: [name]} = parseArgs({
    allowPositionals: true,
    options: {
        "width": {type: "string", default: "1400"},
        "font-size": {type: "string"},
        "dev": {type: "boolean", default: false},
    },
});
if (!name) {
    console.log(USAGE);
    process.exit(1);
}

const outDir = `${SNAPSHOTS_DIR}/${name}`;
rmSync(outDir, {recursive: true, force: true});
mkdirSync(outDir, {recursive: true});

const server = await startServer(options.dev);
const browser = await chromium.launch();
try {
    const baseURL = server.resolvedUrls.local[0].replace(/\/$/, "");
    const page = await browser.newPage({
        locale: "ru-RU",
        timezoneId: "UTC",
        viewport: {width: Number(options.width), height: 800},
    });
    page.on("pageerror", error => console.log(`pageerror: ${error.message}`));
    if (options["font-size"]) {
        await page.addInitScript(emulateBrowserFontSize, options["font-size"]);
    }
    await captureStates(page, baseURL);
    console.log(`Снимок: ${outDir}`);
} finally {
    await browser.close();
    await server.close();
}


async function startServer(dev) {
    const serverOptions = {port: PORT, strictPort: false, open: false};
    if (dev) {
        const server = await createServer({logLevel: "warn", server: serverOptions});
        return server.listen();
    }
    await build({logLevel: "warn", build: {outDir: BUILD_DIR, emptyOutDir: true}});
    return preview({logLevel: "warn", build: {outDir: BUILD_DIR}, preview: serverOptions});
}


// Размер шрифта из настроек браузера задаёт только базовый размер корня.
function emulateBrowserFontSize(size) {
    document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = `html { font-size: ${size}px; }`;
        document.head.prepend(style);
    });
}


async function captureStates(page, baseURL) {
    const list = ".hlist-container:not(.hide)";
    const fresh = async () => {
        await page.mouse.move(0, 790);
        await openApp(page, {baseURL});
    };
    const snap = async state => {
        await page.waitForTimeout(TRANSITION_WAIT_MS);
        writeFileSync(`${outDir}/${state}.json`, JSON.stringify(await page.evaluate(collectStyles)));
        await page.screenshot({path: `${outDir}/${state}.png`, fullPage: true});
        console.log(`  ${state}`);
    };

    await fresh();
    await snap("01-base");
    await page.hover(`${list} .item-outer >> nth=0`);
    await snap("02-hover-card");

    await fresh();
    for (const count of ["three", "eight", "seven", "six", "five"]) {
        await page.click(`${list} .count-icon`);
        await page.hover(`${list} .item-outer >> nth=0`);
        await snap(`03-count-${count}`);
    }
    await page.click(`${list} .count-icon`);
    await page.locator(`${list} .outer-list`).first().evaluate(element => element.scrollLeft = 400);
    await page.hover(`${list} .left-control`);
    await snap("04-scrolled-hover-left");

    await fresh();
    await page.click(`${list} .grid-icon`);
    await snap("05-grid");
    await page.click(`${list} .item-outer >> nth=5`);
    await snap("06-grid-fullitem");

    await fresh();
    await page.click(`${list} .item-outer >> nth=0`);
    await snap("07-fullitem-view");
    await page.click(`${list} .fullitem .change-button button`);
    await snap("08-fullitem-edit");
    await page.fill(`${list} .fullitem input[name=season]`, "0");
    await snap("09-fullitem-invalid");
    await page.click(`${list} .fullitem .delete-button button`);
    await snap("10-alert-dialog");

    await fresh();
    await page.click("#openAddingElementMenuItem");
    await snap("11-adding");
    await page.fill("main > .fullitem input[name=name]", "Новый");
    await snap("12-adding-typed");

    await fresh();
    await page.click("#settingsSubMenuTitle");
    await page.hover("#createBackupSubMenuItem");
    await snap("13-submenu");
    await page.click("#changeLanguageSubMenuItem");
    await snap("14-language-dialog");

    await fresh();
    await page.click(".search");
    await page.keyboard.type("Сериал");
    await page.keyboard.press("ArrowDown");
    await snap("15-search");
}


// Ключ — путь из тегов, классов (без .hide) и индексов среди соседей: одинаков в снимках до и после.
// Логические свойства (inline-size, inset-block-start…) пропускаются: при горизонтальном письме они повторяют физические.
function collectStyles() {
    const logicalProperty = /(^|-)(inline|block)(-|$)|^border-(start|end)-(start|end)-radius$/;
    const result = {};
    const pathOf = element => {
        const parts = [];
        for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
            const classes = [...node.classList].filter(name => name !== "hide").map(name => `.${name}`).join("");
            parts.unshift(`${node.tagName.toLowerCase()}${classes}:${[...node.parentElement.children].indexOf(node)}`);
        }
        return parts.join(">") || "html";
    };
    const dump = (element, pseudo) => {
        const style = getComputedStyle(element, pseudo);
        if (pseudo && pseudo !== "::backdrop" && (style.content === "none" || style.content === "")) {
            return;
        }
        const properties = {};
        for (const property of style) {
            if (!property.startsWith("--") && !logicalProperty.test(property)) {
                properties[property] = style.getPropertyValue(property);
            }
        }
        result[pathOf(element) + (pseudo ?? "")] = properties;
    };
    for (const element of [document.documentElement, ...document.body.querySelectorAll("*")]) {
        if (element.closest("template") || element.tagName === "SCRIPT") {
            continue;
        }
        dump(element);
        dump(element, "::before");
        dump(element, "::after");
        if (element.tagName === "DIALOG" && element.open) {
            dump(element, "::backdrop");
        }
    }
    return result;
}
