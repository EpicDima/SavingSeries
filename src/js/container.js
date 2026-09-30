import {addClass, animate, getSeriesListType, hideElement, removeClass, showElement} from "./common";
import {FullItem} from "./fullitem";
import {LIST_TYPE} from "./constants";


export default class HorizontalContainer {

    static COUNT_CLASSES = {3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight"};
    static MIN_COUNT = 3;
    static MAX_COUNT = 8;
    static DEFAULT_COUNT = 4;


    constructor(id, title, app) {
        this.id = id;
        this.title = title;
        this.app = app;

        this.map = new Map();
        this.countNumber = this.getCountNumberFromLocalStorage();
        this.grid = this.getGridStatusFromLocalStorage();
        this.fullitem = new FullItem(this, this.app.database);

        this.generate();
    }


    updateTitle(newTitle) {
        this.title = newTitle;
        this.container.querySelector(".title").textContent = this.title;
    }


    getFragment() {
        return this.container;
    }


    generate() {
        const template = document.getElementById("containerTemplate");
        this.fragment = template.content.cloneNode(true);

        this.container = this.fragment.querySelector(".hlist-container");
        this.container.id = `horizontalContainer${this.id}`;
        this.container.append(this.fullitem.getFragment());

        this.container.querySelector(".title").textContent = this.title;

        this.scrollableList = this.fragment.querySelector(".outer-list");
        this.hlcList = this.fragment.querySelector(".list");
        this.leftButton = this.fragment.querySelector(".left-control");
        this.rightButton = this.fragment.querySelector(".right-control");
        this.countButton = this.fragment.querySelector(`.count-icon`);
        this.gridButton = this.fragment.querySelector(`.grid-icon`);

        this.setButtonListeners();
        this.updateByCount();
        this.turnGridMode(this.grid);
    }


    getCountNumberFromLocalStorage() {
        const count = this.app.localStorage.getCountNumberOfContainer(this.id);
        // two и nine остались от старых версий
        const countNumber = {two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9}[count];
        if (!countNumber) {
            return HorizontalContainer.DEFAULT_COUNT;
        }
        return Math.min(Math.max(countNumber, HorizontalContainer.MIN_COUNT), HorizontalContainer.MAX_COUNT);
    }


    setCountToLocalStorage(count) {
        this.app.localStorage.setCountNumberOfContainer(this.id, count);
    }


    getGridStatusFromLocalStorage() {
        let grid = this.app.localStorage.getGridStateOfContainer(this.id);
        return grid === "true";
    }


    setGridStatusToLocalStorage(grid) {
        this.app.localStorage.setGridStateOfContainer(this.id, grid ? "true" : "false");
    }


    // Прокрутка на целое число карточек: ширина списка им не кратна, и с каждым кликом край уезжал на пару пикселей
    scrollList(direction) {
        this.stopScroll?.();
        const {scrollLeft: start, clientWidth: width, scrollWidth} = this.scrollableList;
        const pitch = this.getItemPitch() || width;
        const cards = Math.max(Math.round(width / pitch), 1);
        // Клик посреди прокрутки считается от её цели, а не от промежуточного положения
        const from = this.scrollTarget ?? start;
        const target = Math.min(Math.max((Math.round(from / pitch) + direction * cards) * pitch, 0), scrollWidth - width);
        this.scrollTarget = target;
        this.stopScroll = animate({
            duration: 250,
            draw: (progress) => this.scrollableList.scrollLeft = start + (target - start) * progress,
            complete: () => this.scrollTarget = null
        });
    }


    // Дробное расстояние между соседними карточками: округлённое накапливало бы ошибку
    getItemPitch() {
        const [first, second] = this.hlcList.children;
        if (!second) {
            return 0;
        }
        return second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    }


    setButtonListeners() {
        this.scrollableList.addEventListener("scroll", () => this.checkLeftRightButtons(), {passive: true});
        // Ширина карточек с content-visibility: auto известна только после их отрисовки
        this.resizeObserver = new ResizeObserver(() => this.checkLeftRightButtons());
        this.resizeObserver.observe(this.scrollableList);
        this.resizeObserver.observe(this.hlcList);

        this.leftButton.onclick = (event) => {
            event.preventDefault();
            this.scrollList(-1);
        };
        this.rightButton.onclick = (event) => {
            event.preventDefault();
            this.scrollList(1);
        };

        this.countButton.onclick = () => {
            this.countNumber--;
            if (this.countNumber < HorizontalContainer.MIN_COUNT) {
                this.countNumber = HorizontalContainer.MAX_COUNT;
            }
            this.updateByCount();
        };
        this.gridButton.onclick = () => {
            this.turnGridMode(!this.grid);
        };
    }


    updateByCount() {
        const count = HorizontalContainer.COUNT_CLASSES[this.countNumber];
        const classList = Object.values(HorizontalContainer.COUNT_CLASSES);

        this.countButton.classList.remove(...classList);
        this.countButton.classList.add(count);

        this.hlcList.classList.remove(...classList);
        this.hlcList.classList.add(count);

        this.fullitem.moveByGridState();
        this.setCountToLocalStorage(count);
    }


    showGrid() {
        this.grid = true;
        addClass(this.gridButton, "on");
        addClass(this.hlcList, "grid");
        this.showLeftRightButtons(false);
        this.fullitem.moveByGridState();
        this.setGridStatusToLocalStorage(this.grid);
    }


    hideGrid() {
        this.grid = false;
        removeClass(this.gridButton, "on");
        removeClass(this.hlcList, "grid");
        this.checkLeftRightButtons();
        this.fullitem.moveToDefault();
        this.setGridStatusToLocalStorage(this.grid);
    }


    turnGridMode(on = false) {
        if (on) {
            this.showGrid();
        } else {
            this.hideGrid();
        }
    }


    showLeftRightButtons(show = true) {
        if (show) {
            showElement(this.leftButton);
            showElement(this.rightButton);
        } else {
            hideElement(this.leftButton);
            hideElement(this.rightButton);
        }
    }


    checkLeftRightButtons() {
        if (this.grid) {
            return;
        }
        // Допуск в пиксель: при масштабе страницы scrollLeft дробный
        const {scrollLeft, scrollWidth, clientWidth} = this.scrollableList;
        this.leftButton.classList.toggle("hide", scrollLeft < 1);
        this.rightButton.classList.toggle("hide", scrollLeft > scrollWidth - clientWidth - 1);
    }


    show() {
        showElement(this.container);
    }


    hide() {
        hideElement(this.container);
    }


    remove() {
        this.resizeObserver.disconnect();
        this.fullitem.remove();
        this.container.remove();
    }


    clear() {
        this.hide();
        for (let series of this.map.values()) {
            series.remove();
        }
        this.map.clear();
        this.fullitem.close();
    }


    simplyAddSeries(series) {
        this.map.set(series.data.id, series);
        this.setListenersOnSeries(series);
    }


    addSeries(series) {
        this.insertSeries(series);
        this.scrollFromAnother(series);
    }


    insertSeries(series) {
        if (this.map.size === 0) {
            this.show();
        }
        this.simplyAddSeries(series);
        if (this.isNeedSortByListType()) {
            this.sortByDate();
        }
        this.showItems();
    }


    // Открытую на правке карточку не закрываем, чтобы не потерять правку
    releaseSeries(series) {
        if (this.fullitem.series === series && !this.fullitem.changeMode) {
            this.fullitem.close();
        }
        this.deleteSeries(series, true);
    }


    sortByDate() {
        let indexes = [...this.map.keys()];
        this.map = new Map([...this.map.entries()].sort((prev, next) => {
            return prev[1].data.date - next[1].data.date;
        }));
        let newIndexes = [...this.map.keys()];
        for (let i = 0; i < indexes.length; i++) {
            if (indexes[i] !== newIndexes[i]) {
                return true;
            }
        }
        return false;
    }


    isNeedSortByListType() {
        return this.id === LIST_TYPE.RELEASED
            || this.id === LIST_TYPE.RELEASED_NEXT_7_DAYS
            || this.id === LIST_TYPE.WITH_DATE_OTHERS;
    }


    showItems() {
        const fragment = new DocumentFragment();
        for (const series of this.map.values()) {
            fragment.append(series.getFragment());
        }
        this.hlcList.append(fragment);
        // В сетке полная карточка стоит среди карточек, а они только что переехали в конец списка
        this.fullitem.moveByGridState();
    }


    initialAdditionFinish() {
        if (this.isNeedSortByListType()) {
            this.sortByDate();
        }
        this.showItems();
        if (this.map.size > 0) {
            this.show();
        }
        for (const series of this.map.values()) {
            series.loadImageAsync();
        }
    }


    setListenersOnSeries(series) {
        series.onUpdateListener = () => this.onSeriesUpdate(series.data.id);
        series.onDeleteListener = () => this.deleteSeries(series);
    }


    removeListenersFromSeries(series) {
        series.onUpdateListener = null;
        series.onDeleteListener = null;
    }


    onSeriesUpdate(id) {
        let series = this.map.get(id);
        let listType = getSeriesListType(series);
        if (listType !== this.id) {
            this.deleteSeries(series, true);
            this.app.relocateSeries(series, listType);
            setTimeout(() => this.scrollFromAnother(series), 300);
        } else {
            if (this.isNeedSortByListType()) {
                if (this.sortByDate()) {
                    this.showItems();
                    this.scrollInThis(series);
                }
            }
        }
    }


    scrollFromAnother(series) {
        series.getFragment().scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        })
    }


    scrollInThis(series) {
        let scrollTop = document.documentElement.scrollTop;
        series.getFragment().scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest"
        });
        document.documentElement.scrollTop = scrollTop;
    }


    deleteSeries(series, update = false) {
        this.removeListenersFromSeries(series);
        this.map.delete(series.data.id);
        if (!update) {
            series.remove();
        }
        if (this.map.size === 0) {
            this.hide();
        }
    }


    showFullItemIfExists(id) {
        let series = this.map.get(id);
        if (series) {
            this.fullitem.open(series);
            this.scrollInThis(series);
            return true;
        }
        return false;
    }
}
