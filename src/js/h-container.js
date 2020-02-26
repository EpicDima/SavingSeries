import {getSeriesListType} from "./common";
import {FullItem} from "./fullitem";

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
            <div class="title">${this.title}</div>
            <div class="outer-list">
                <div id="hlcList${this.id}" class="list"></div>
                <div class="left-icon-control" id="leftButton${this.id}"></div>
                <div class="right-icon-control" id="rightButton${this.id}"></div>
            </div>
            ${this.fullitem.createHtml()}
        </div>`;
    }

    setLeftRightButtons(id) {
        $(`#leftButton${id}`)[0].onclick = (event) => {
            event.preventDefault();
            let list = $(`#hlcList${id}`);
            list.animate({
                scrollLeft: `-=${list.width() * 0.95}`
            }, 300);
        };
        $(`#rightButton${id}`)[0].onclick = (event) => {
            event.preventDefault();
            let list = $(`#hlcList${id}`);
            list.animate({
                scrollLeft: `+=${list.width() * 0.95}`
            }, 300);
        };
    }

    show() {
        $(`#horizontalContainer${this.id}`).show();
        this.setLeftRightButtons(this.id);
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
        $(`#hlcList${this.id}`).append(series.createHtml());
    }

    initialAdditionFinish() {
        let inner = "";
        for (let series of this.map.values()) {
            inner += series.createHtml();
        }
        $(`#hlcList${this.id}`).html(inner);
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
            // можно произвести сортироку по дате в списке
        }
    }

    deleteSeries(series) {
        this.removeListenersFromSeries(series);
        this.map.delete(series.data.id);
        series.deleteHtml();
        if (this.map.size === 0) {
            this.hide();
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