import {getSeriesListType} from "./common";
import {FullItem} from "./fullitem";
import {LIST_TYPE} from "./constants";

export default class HorizontalContainer {
    constructor(id, title, relocateSeries) {
        this.id = id; // list type
        this.title = title;
        this.relocateSeries = relocateSeries;
        this.map = new Map();
    }

    createHtml() {
        this.fullitem = new FullItem(this.id);
        return `<div id="horizontalContainer${this.id}" class="hlist-container">
            <div class="top">
                <div class="title">${this.title}</div>
                <div class="grid-icon"></div>
            </div>
            <div class="outer-container-list">
                <div id="outerList${this.id}" class="outer-list">
                    <div id="hlcList${this.id}" class="list"></div>
                </div>
                <div class="left-icon-control" id="leftButton${this.id}"></div>
                <div class="right-icon-control" id="rightButton${this.id}"></div>
            </div>
            ${this.fullitem.createHtml()}
        </div>`;
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
        this.gridButton = document.querySelector(`#horizontalContainer${this.id} .grid-icon`);
    }

    setButtonListeners() {
        this.onScrollStopped(this.scrollableList, () => this.checkLeftRightButtons());

        this.leftButton.onclick = (event) => {
            event.preventDefault();
            let list = $(`#outerList${this.id}`);
            list.animate({
                scrollLeft: `-=${list.width()}`
            }, 300, () => this.checkLeftRightButtons());
        };
        this.rightButton.onclick = (event) => {
            event.preventDefault();
            let list = $(`#outerList${this.id}`);
            list.animate({
                scrollLeft: `+=${list.width()}`
            }, 300, () => this.checkLeftRightButtons());
        };

        this.gridButton.onclick = () => {
            this.turnGridMode(!this.gridButton.classList.contains("on"));
        };
    }

    turnGridMode(on = false) {
        let list = document.getElementById(`hlcList${this.id}`);
        if (on) {
            list.style.flexWrap = "wrap";
            this.gridButton.classList.add("on");
            this.showLeftRightButtons(false);
        } else {
            list.style.flexWrap = "nowrap";
            this.gridButton.classList.remove("on");
            this.showLeftRightButtons();
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
        let scrollLeftMax = this.scrollableList.scrollLeftMax;
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
        this.checkLeftRightButtons();
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
        } else {
            if (this.isNeedSortByListType()) {
                if (this.sortByDate()) {
                    this.showItems();

                    let scrollTop = document.documentElement.scrollTop;
                    document.getElementById(`item${id}`).scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                        inline: "nearest"
                    });
                    document.documentElement.scrollTop = scrollTop;
                    this.checkLeftRightButtons();
                }
            }
        }
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
            return true;
        }
        return false;
    }
}