import {expect, test} from "@playwright/test";
import {collectProblems, openApp, sampleSeries, storedSeriesNames} from "./support/app";

let problems;

test.beforeEach(({page}) => {
    problems = collectProblems(page);
});

test.afterEach(() => {
    expect(problems).toEqual([]);
});


test("раскладывает сериалы по спискам", async ({page}) => {
    await openApp(page);

    const visibleContainers = page.locator(".hlist-container:not(.hide)");
    await expect(visibleContainers.locator(".title")).toHaveText([
        "Вышедшие", "Просматривающиеся", "В течение недели", "В ближайшее время", "Ожидаются", "Брошены", "Просмотрены",
    ]);
    await expect(page.locator(".item-outer")).toHaveCount(sampleSeries().length);
});


test("добавленный сериал остаётся после перезагрузки", async ({page}) => {
    await openApp(page, {series: []});

    await page.locator("#openAddingElementMenuItem").click();
    const form = page.locator("main > .fullitem");
    await form.locator("input[name=name]").fill("Новый сериал");
    await form.locator(".add-button button").click();
    await expect(page.locator(".item .name", {hasText: "Новый сериал"})).toBeVisible();
    await expect.poll(() => storedSeriesNames(page)).toEqual(["Новый сериал"]);

    await page.reload();
    await expect(page.locator(".item .name", {hasText: "Новый сериал"})).toBeVisible();
});


test("backup сохраняется и загружается обратно", async ({page}) => {
    await openApp(page);

    await page.locator("#settingsSubMenuTitle").click();
    const downloading = page.waitForEvent("download");
    await page.locator("#createBackupSubMenuItem").click();
    const backupPath = await (await downloading).path();

    await openApp(page, {series: []});
    await expect(page.locator(".item-outer")).toHaveCount(0);

    await page.locator("#settingsSubMenuTitle").click();
    await page.locator("#loadBackupSubMenuItem").click();
    const choosing = page.waitForEvent("filechooser");
    await page.locator("dialog[open] .accept").click();
    await (await choosing).setFiles(backupPath);

    await expect(page.locator(".item-outer")).toHaveCount(sampleSeries().length);
});
