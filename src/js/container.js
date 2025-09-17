import {addClass, animate, getSeriesListType, hideElement, removeClass, showElement} from "./common";
import {FullItem} from "./fullitem";
import {LIST_TYPE} from "./constants";


export default class HorizontalContainer {
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
        const countMap = {
            two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9
        };
        return countMap[count] || 4;
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


    onScrollStopped(elem, callback, timeout = 300) {
        callback.timeout = 0;
        elem.onscroll = () => {
            let now = Date.now();
            if (now - callback.timeout >= timeout) {
                callback.timeout = now;
                setTimeout(callback, timeout);
            }
        };
    }


    scrollList(draw) {
        let start = this.scrollableList.scrollLeft;
        let width = this.scrollableList.offsetWidth;
        animate({
            duration: 250,
            draw: (progress) => draw(start, width, progress)
        });
    }


    scrollListToLeft() {
        this.scrollList((start, width, progress) => this.scrollableList.scrollLeft = start - width * progress);
    }


    scrollListToRight() {
        this.scrollList((start, width, progress) => this.scrollableList.scrollLeft = start + width * progress);
    }


    setButtonListeners() {
        this.onScrollStopped(this.scrollableList, () => this.checkLeftRightButtons());

        this.leftButton.onclick = (event) => {
            event.preventDefault();
            this.scrollListToLeft();
        };
        this.rightButton.onclick = (event) => {
            event.preventDefault();
            this.scrollListToRight();
        };

        this.countButton.onclick = () => {
            this.countNumber--;
            if (this.countNumber === 1) {
                this.countNumber = 9;
            }
            this.updateByCount();
        };
        this.gridButton.onclick = () => {
            this.turnGridMode(!this.grid);
        };
    }


    updateByCount() {
        const countMap = {
            2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine"
        };
        const count = countMap[this.countNumber] || "four";

        let classList = ["two", "three", "four", "five", "six", "seven", "eight", "nine"];

        this.countButton.classList.remove(...classList);
        this.countButton.classList.add(count);

        this.hlcList.classList.remove(...classList);
        this.hlcList.classList.add(count);

        this.checkLeftRightButtons();
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
        let scrollLeft = this.scrollableList.scrollLeft;
        let scrollLeftMax = this.scrollableList.scrollWidth - this.scrollableList.clientWidth;
        if (scrollLeft === 0) {
            this.leftButton.classList.add("hide");
            if (scrollLeftMax === 0) {
                this.rightButton.classList.add("hide");
            } else {
                this.rightButton.classList.remove("hide");
            }
        } else {
            this.leftButton.classList.remove("hide");
            if (scrollLeftMax === scrollLeft) {
                this.rightButton.classList.add("hide");
            } else {
                this.rightButton.classList.remove("hide");
            }
        }
    }


    show() {
        showElement(this.container);
        this.checkLeftRightButtons();
    }


    hide() {
        hideElement(this.container);
    }


    remove() {
        this.container.remove();
    }


    clear() {
        this.hide();
        for (let series of this.map.values()) {
            series.remove();
        }
        this.map.clear();
        this.fullitem.hide();
    }


    simplyAddSeries(series) {
        this.map.set(series.data.id, series);
        this.setListenersOnSeries(series);
    }


    addSeries(series) {
        if (this.map.size === 0) {
            this.show();
        }
        this.simplyAddSeries(series);
        if (this.isNeedSortByListType()) {
            this.sortByDate();
        }
        this.showItems();
        this.checkLeftRightButtons();
        this.scrollFromAnother(series);
        series.updateImage();
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
                    this.checkLeftRightButtons();
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
        } else {
            this.checkLeftRightButtons();
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
