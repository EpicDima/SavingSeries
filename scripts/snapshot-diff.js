import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {parseArgs} from "node:util";
import {chromium} from "@playwright/test";

const USAGE = `yarn snapshot:diff <до> <после> [--max 40]

Сравнивает снимки из .snapshots (yarn snapshot): по каждому состоянию — изменившиеся computed-стили
(не больше --max строк) и отличия скриншотов по пикселям. Карта отличий (красным) —
в .snapshots/diff-<до>-<после>/<состояние>.png.`;

const SNAPSHOTS_DIR = ".snapshots";

const {values: options, positionals: [before, after]} = parseArgs({
    allowPositionals: true,
    options: {
        "max": {type: "string", default: "40"},
    },
});
if (!before || !after) {
    console.log(USAGE);
    process.exit(1);
}
for (const name of [before, after]) {
    if (!existsSync(`${SNAPSHOTS_DIR}/${name}`)) {
        console.log(`Нет снимка ${SNAPSHOTS_DIR}/${name}`);
        process.exit(1);
    }
}

const diffDir = `${SNAPSHOTS_DIR}/diff-${before}-${after}`;
rmSync(diffDir, {recursive: true, force: true});

const states = readdirSync(`${SNAPSHOTS_DIR}/${before}`)
    .filter(file => file.endsWith(".json"))
    .map(file => file.slice(0, -".json".length))
    .sort();
const changes = [];
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    for (const state of states) {
        const read = (name, extension) => readFileSync(`${SNAPSHOTS_DIR}/${name}/${state}.${extension}`);
        if (!existsSync(`${SNAPSHOTS_DIR}/${after}/${state}.json`)) {
            changes.push({state, summary: `нет в ${after}`, styleLines: []});
            continue;
        }
        const styleLines = diffStyles(JSON.parse(read(before, "json")), JSON.parse(read(after, "json")));
        const pixels = read(before, "png").equals(read(after, "png"))
            ? null
            : await diffPixels(page, read(before, "png"), read(after, "png"), `${diffDir}/${state}.png`);
        if (styleLines.length || pixels?.count) {
            changes.push({state, summary: describePixels(pixels), styleLines});
        }
    }
} finally {
    await browser.close();
}
printChanges(changes);


// Строки, общие для всех изменившихся состояний, печатаются один раз.
function printChanges(changes) {
    if (!changes.length) {
        console.log("Отличий нет");
        return;
    }
    const max = Number(options.max);
    const printLines = lines => {
        lines.slice(0, max).forEach(line => console.log(`  ${line}`));
        if (lines.length > max) {
            console.log(`  … и ещё ${lines.length - max}`);
        }
    };
    const common = changes.length > 1
        ? changes[0].styleLines.filter(line => changes.every(change => change.styleLines.includes(line)))
        : [];
    if (common.length) {
        console.log(`Во всех изменившихся состояниях (${common.length}):`);
        printLines(common);
    }
    for (const {state, summary, styleLines} of changes) {
        const own = styleLines.filter(line => !common.includes(line));
        console.log(`${state}: ${summary}${own.length ? `, свои изменения стилей: ${own.length}` : ""}`);
        printLines(own);
    }
    console.log(`Изменились состояния: ${changes.length} из ${states.length}`);
}


// Одинаковые изменения у соседних элементов (путь без индексов) схлопываются в одну строку.
function diffStyles(before, after) {
    const lines = new Set();
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const shortKey = key.split(">").slice(-3).join(">").replace(/:\d+/g, "");
        if (!before[key] || !after[key]) {
            lines.add(`${before[key] ? "-" : "+"} ${shortKey}`);
            continue;
        }
        for (const property of new Set([...Object.keys(before[key]), ...Object.keys(after[key])])) {
            if (before[key][property] !== after[key][property]) {
                lines.add(`${shortKey} ${property}: ${before[key][property]} -> ${after[key][property]}`);
            }
        }
    }
    return [...lines];
}


function describePixels(pixels) {
    if (!pixels) {
        return "скриншот тот же";
    }
    if (pixels.sizeBefore !== pixels.sizeAfter) {
        return `размер скриншота ${pixels.sizeBefore} -> ${pixels.sizeAfter}`;
    }
    return pixels.count
        ? `пикселей отличается ${pixels.count}, max Δ ${pixels.maxDelta}, область ${pixels.box}`
        : "скриншот тот же по пикселям";
}


async function diffPixels(page, before, after, diffPath) {
    const toDataUrl = png => `data:image/png;base64,${png.toString("base64")}`;
    const result = await page.evaluate(comparePngs, [toDataUrl(before), toDataUrl(after)]);
    if (result.count) {
        mkdirSync(diffDir, {recursive: true});
        writeFileSync(diffPath, Buffer.from(result.diffPng));
    }
    return result;
}


async function comparePngs([beforeUrl, afterUrl]) {
    const load = async url => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
    };
    const [before, after] = await Promise.all([load(beforeUrl), load(afterUrl)]);
    const width = Math.max(before.width, after.width);
    const height = Math.max(before.height, after.height);
    const pixelsOf = image => {
        const context = new OffscreenCanvas(width, height).getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, width, height).data;
    };
    const a = pixelsOf(before);
    const b = pixelsOf(after);

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    const diff = context.createImageData(width, height);
    let count = 0;
    let maxDelta = 0;
    let left = width, top = height, right = 0, bottom = 0;
    for (let i = 0; i < a.length; i += 4) {
        const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        const x = (i / 4) % width;
        const y = Math.floor(i / 4 / width);
        diff.data[i + 3] = 255;
        if (delta) {
            count++;
            maxDelta = Math.max(maxDelta, delta);
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
            diff.data[i] = 255;
        } else {
            diff.data[i] = diff.data[i + 1] = diff.data[i + 2] = a[i] / 4;
        }
    }
    context.putImageData(diff, 0, 0);
    const diffPng = count ? [...new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer())] : null;
    return {
        sizeBefore: `${before.width}x${before.height}`,
        sizeAfter: `${after.width}x${after.height}`,
        count,
        maxDelta,
        box: `${left},${top}-${right},${bottom}`,
        diffPng,
    };
}
