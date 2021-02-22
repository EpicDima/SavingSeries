import {addClass, animate, getSeriesListType, hideElement, parseHtml, removeClass, showElement} from "./common";
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


    getFragment() {
        return this.container;
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.container = this.fragment.getElementById(`horizontalContainer${this.id}`);
        this.container.append(this.fullitem.getFragment());

        this.scrollableList = this.fragment.getElementById(`outerList${this.id}`);
        this.hlcList = this.fragment.getElementById(`hlcList${this.id}`);
        this.leftButton = this.fragment.getElementById(`leftButton${this.id}`);
        this.rightButton = this.fragment.getElementById(`rightButton${this.id}`);
        this.countButton = this.fragment.querySelector(`.count-icon`);
        this.gridButton = this.fragment.querySelector(`.grid-icon`);

        this.setButtonListeners();
        this.updateByCount();
        this.turnGridMode(this.grid);
    }


    createHtml() {
        return `<div id="horizontalContainer${this.id}" class="hlist-container hide">
            <div class="top">
                <div class="title">${this.title}</div>
                <div class="options">
                    <div class="count-icon four" title="Карточек в строке"></div>
                    <div class="grid-icon" title="Сетка"></div>
                </div>
            </div>
            <div class="outer-container-list">
                <div id="outerList${this.id}" class="outer-list">
                    <div id="hlcList${this.id}" class="list"></div>
                </div>
                <div class="left-control" id="leftButton${this.id}">
                    <div class="left-icon"></div>
                </div>
                <div class="right-control" id="rightButton${this.id}">
                    <div class="right-icon"></div>
                </div>
            </div>
        </div>`;
    }


    getCountNumberFromLocalStorage() {
        let count = this.app.localStorage.getCountNumberOfContainer(this.id);
        switch (count) {
            case "two":
                return 2;
            case "three":
                return 3;
            case "four":
                return 4;
            case "five":
                return 5;
            case "six":
                return 6;
            case "seven":
                return 7;
            case "eight":
                return 8;
            case "nine":
                return 9;
            default:
                return 4;
        }
    }


    setCountToLocaStorage(count) {
        this.app.localStorage.setCountNumberOfContainer(this.id, count);
    }


    getGridStatusFromLocalStorage() {
        let grid = this.app.localStorage.getGridStateOfContainer(this.id);
        return grid === "true";
    }


    setGridStatusToLocaStorage(grid) {
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
        let count;
        switch (this.countNumber) {
            case 2:
                count = "two";
                break;
            case 3:
                count = "three";
                break;
            case 4:
                count = "four";
                break;
            case 5:
                count = "five";
                break;
            case 6:
                count = "six";
                break;
            case 7:
                count = "seven";
                break;
            case 8:
                count = "eight";
                break;
            case 9:
                count = "nine";
                break;
            default:
                count = "four";
                break;
        }

        let classList = ["two", "three", "four", "five", "six", "seven", "eight", "nine"];

        this.countButton.classList.remove(...classList);
        this.countButton.classList.add(count);

        this.hlcList.classList.remove(...classList);
        this.hlcList.classList.add(count);

        this.checkLeftRightButtons();
        this.fullitem.moveByGridState();
        this.setCountToLocaStorage(count);
    }


    showGrid() {
        this.grid = true;
        addClass(this.gridButton, "on");
        addClass(this.hlcList, "grid");
        this.showLeftRightButtons(false);
        this.fullitem.moveByGridState();
        this.setGridStatusToLocaStorage(this.grid);
    }


    hideGrid() {
        this.grid = false;
        removeClass(this.gridButton, "on");
        removeClass(this.hlcList, "grid");
        this.checkLeftRightButtons();
        this.fullitem.moveToDefault();
        this.setGridStatusToLocaStorage(this.grid);
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
        let inner = [];
        for (let series of this.map.values()) {
            inner.push(series.getFragment());
        }
        this.hlcList.append(...inner);
    }


    initialAdditionFinish() {
        if (this.isNeedSortByListType()) {
            this.sortByDate();
        }
        this.showItems();
        if (this.map.size > 0) {
            this.show();
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
        let listtype = getSeriesListType(series);
        if (listtype !== this.id) {
            this.deleteSeries(series, true);
            this.app.relocateSeries(series, listtype);
            setTimeout(() => this.scrollFromAnother(series), 300);
        } else {
            if (this.isNeedSortByListType()) {
                if (this.sortByDate()) {
                    this.showItems();
                    this.scrollInThis(id);
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
