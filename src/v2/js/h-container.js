import {getSeriesListType} from "./common";
import {FullItem} from "./fullitem";
import {LIST_TYPE} from "./constants";

export default class HorizontalContainer {
    constructor(id, title, relocateSeries) {
        this.id = id; // list type
        this.title = title;
        this.relocateSeries = relocateSeries;
        this.map = new Map();
        this.countNumber = this.getCountNumberFromLocalStorage();
    }

    createHtml() {
        this.fullitem = new FullItem(this);
        return `<div id="horizontalContainer${this.id}" class="hlist-container">
            <div class="top">
                <div class="title">${this.title}</div>
                <div class="options">
                    <div class="count-icon four"></div>
                    <div class="grid-icon"></div>
                </div>
            </div>
            <div class="outer-container-list">
                <div id="outerList${this.id}" class="outer-list">
                    <div id="hlcList${this.id}" class="list"></div>
                </div>
                <div class="left-icon" id="leftButton${this.id}"></div>
                <div class="right-icon" id="rightButton${this.id}"></div>
            </div>
            ${this.fullitem.createHtml()}
        </div>`;
    }

    initParams() {
        let params;
        try {
            params = JSON.parse(localStorage.getItem("params"));
        } catch (e) {}
        if (!params) {
            params = {};
            params.containers = {};
        }
        if (!params.containers[this.id]) {
            params.containers[this.id] = {};
        }
        return params;
    }

    getCountNumberFromLocalStorage() {
        try {
            let params = JSON.parse(localStorage.getItem("params"));
            let count = params.containers[this.id].count;
            switch (count) {
                case "three":
                    return 3;
                case "five":
                    return 5;
                case "six":
                    return 6;
            }
            return 4;
        } catch (e) {
            return 4;
        }
    }

    setCountToLocaStorage(count) {
        let params = this.initParams();
        params.containers[this.id].count = count ? count : "four";
        localStorage.setItem("params", JSON.stringify(params));
    }

    getGridStatusFromLocalStorage() {
        try {
            let params = JSON.parse(localStorage.getItem("params"));
            return params.containers[this.id].grid === "true";
        } catch (e) {
            return false;
        }
    }

    setGridStatusToLocaStorage(grid) {
        let params = this.initParams();
        params.containers[this.id].grid = grid ? "true" : "false";
        localStorage.setItem("params", JSON.stringify(params));
    }

    onScrollStopped(domElement, callback, timeout = 250) {
        domElement.onscroll = () => {
            clearTimeout(callback.timeout);
            callback.timeout = setTimeout(callback, timeout);
        };
    }

    saveButtons() {
        this.scrollableList = document.getElementById(`outerList${this.id}`);
        this.leftButton = document.getElementById(`leftButton${this.id}`);
        this.rightButton = document.getElementById(`rightButton${this.id}`);
        this.countButton = document.querySelector(`#horizontalContainer${this.id} .count-icon`);
        this.gridButton = document.querySelector(`#horizontalContainer${this.id} .grid-icon`);
    }

    setButtonListeners() {
        this.onScrollStopped(this.scrollableList, () => this.checkLeftRightButtons());

        this.leftButton.onclick = (event) => {
            event.preventDefault();
            let list = $(`#outerList${this.id}`);
            list.animate({
                scrollLeft: `-=${list.width()}`
            }, 250, () => this.checkLeftRightButtons());
        };
        this.rightButton.onclick = (event) => {
            event.preventDefault();
            let list = $(`#outerList${this.id}`);
            list.animate({
                scrollLeft: `+=${list.width()}`
            }, 250, () => this.checkLeftRightButtons());
        };

        this.countButton.onclick = () => {
            this.countNumber--;
            if (this.countNumber === 2) {
                this.countNumber = 6;
            }
            this.updateByCount();
        };
        this.gridButton.onclick = () => {
            this.turnGridMode(!this.gridButton.classList.contains("on"));
        };
    }

    updateByCount() {
        let count = "four";
        switch (this.countNumber) {
            case 3:
                count = "three";
                break;
            case 5:
                count = "five";
                break;
            case 6:
                count = "six";
                break;
        }

        let classList = ["three", "four", "five", "six"];

        this.countButton.classList.remove(...classList);
        this.countButton.classList.add(count);

        let list = document.getElementById(`hlcList${this.id}`);
        list.classList.remove(...classList);
        list.classList.add(count);

        this.leftButton.classList.remove(...classList);
        this.leftButton.classList.add(count);

        this.rightButton.classList.remove(...classList);
        this.rightButton.classList.add(count);

        this.checkLeftRightButtons();
        this.fullitem.moveByGridState();
        this.setCountToLocaStorage(count);
    }

    showGrid() {
        this.gridButton.classList.add("on");
        document.getElementById(`hlcList${this.id}`).classList.add("grid");
        this.showLeftRightButtons(false);
        this.fullitem.moveByGridState();
        this.setGridStatusToLocaStorage(true);
    }

    hideGrid() {
        this.gridButton.classList.remove("on");
        document.getElementById(`hlcList${this.id}`).classList.remove("grid");
        this.checkLeftRightButtons();
        this.fullitem.moveToDefault();
        this.setGridStatusToLocaStorage(false);
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
            this.leftButton.classList.remove("hide");
            this.rightButton.classList.remove("hide");
        } else {
            this.leftButton.classList.add("hide");
            this.rightButton.classList.add("hide");
        }
    }

    checkLeftRightButtons() {
        if (this.gridButton.classList.contains("on")) {
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
        $(`#horizontalContainer${this.id}`).show();
        this.saveButtons();
        this.setButtonListeners();

        this.updateByCount();
        this.turnGridMode(this.getGridStatusFromLocalStorage());
    }

    hide() {
        $(`#horizontalContainer${this.id}`).hide();
    }

    remove() {
        $(`#horizontalContainer${this.id}`).remove();
    }

    initialAddSeries(series) {
        this.map.set(series.data.id, series);
        this.setListenersOnSeries(series);
    }

    addSeries(series) {
        this.show();
        this.map.set(series.data.id, series);
        this.setListenersOnSeries(series);
        if (this.isNeedSortByListType()) {
            this.sortByDate();
        }
        this.showItems();
        this.checkLeftRightButtons();
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
        let inner = "";
        for (let series of this.map.values()) {
            inner += series.createHtml();
        }
        document.getElementById(`hlcList${this.id}`).innerHTML = inner;
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
            this.deleteSeries(series);
            this.relocateSeries(series, listtype);
            setTimeout(() => this.scrollFromAnother(id), 250);
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

    scrollFromAnother(id) {
        document.getElementById(`item${id}`).scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }

    scrollInThis(id) {
        let scrollTop = document.documentElement.scrollTop;
        document.getElementById(`item${id}`).scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest"
        });
        document.documentElement.scrollTop = scrollTop;
    }

    deleteSeries(series) {
        this.removeListenersFromSeries(series);
        this.map.delete(series.data.id);
        series.deleteHtml();
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
            this.scrollInThis(id);
            return true;
        }
        return false;
    }
}
