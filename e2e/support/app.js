// Фиксированный «сегодня»: раскладка по спискам и снимки не зависят от дня запуска.
export const TODAY = new Date("2026-06-15T12:00:00Z");

// Сериалы во все списки; у нечётных id есть картинка.
export function sampleSeries() {
    // Полночь UTC, как дату хранит поле ввода
    const day = offset => new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate() + offset));
    const rows = [
        ...Array.from({length: 12}, (_, i) => ({date: day(-3 - i), status: "0"})),
        ...Array.from({length: 3}, (_, i) => ({date: day(2 + i), status: "0"})),
        ...Array.from({length: 2}, (_, i) => ({date: day(30 + i), status: "0"})),
        {date: "", status: "0"},
        {date: "", status: "0"},
        {date: day(-100), status: "1"},
        {date: day(-50), status: "2"},
        {date: "", status: "3"},
    ];
    return rows.map((row, index) => ({
        id: index + 1,
        name: `Сериал номер ${index + 1} с длинным названием`,
        season: 2,
        episode: index + 1,
        site: "https://example.com/show",
        note: "Заметка",
        ...row,
    }));
}


export function collectProblems(page) {
    const problems = [];
    page.on("pageerror", error => problems.push(`pageerror: ${error.message}`));
    page.on("console", message => message.type() === "error" && problems.push(`console.error: ${message.text()}`));
    return problems;
}


// Открывает приложение только с переданными сериалами (по умолчанию sampleSeries) и чистым localStorage.
export async function openApp(page, {series = sampleSeries(), baseURL = ""} = {}) {
    await page.clock.setFixedTime(TODAY);
    await page.goto(`${baseURL}/`);
    await page.waitForFunction(() => document.querySelector(".hlist-container"));
    await page.evaluate(putSeries, series);
    await page.reload();
    await page.waitForFunction(count => document.querySelectorAll(".item-outer").length >= count, series.length);
}


export function storedSeriesNames(page) {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open("SavingSeries");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const getAll = request.result.transaction("series_meta").objectStore("series_meta").getAll();
            getAll.onsuccess = () => {
                request.result.close();
                resolve(getAll.result.map(series => series.name));
            };
        };
    }));
}


function putSeries(series) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 320, 180);
    gradient.addColorStop(0, "#c33");
    gradient.addColorStop(1, "#33c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 320, 180);
    const image = canvas.toDataURL("image/jpeg", 0.8);

    localStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SavingSeries");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const transaction = request.result.transaction(["series_meta", "series_images"], "readwrite");
            transaction.objectStore("series_meta").clear();
            transaction.objectStore("series_images").clear();
            for (const {date, ...meta} of series) {
                transaction.objectStore("series_meta").put({...meta, date: date ? new Date(date) : ""});
                if (meta.id % 2) {
                    transaction.objectStore("series_images").put({id: meta.id, image});
                }
            }
            transaction.oncomplete = () => {
                request.result.close();
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        };
    });
}
