import FullItem from "./fullitem";

export default class HorizontalContainer {
    constructor(id, title) {
        this.id = id;
        this.title = title;
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
            <div id="outerFullitem${this.id}" class="collapse">
                ${this.fullitem.createHtml()}
            </div>
        </div>`;
    }

    show() {
        $(`#horizontalContainer${this.id}`).show();
    }

    hide() {
        $(`#horizontalContainer${this.id}`).hide();
    }

    addSeries(series) {
        this.show();
        this.map.set(series.id, series);
        $(`#hlcList${this.id}`).append(series.createHtml());
    }

    showFullItemIfExists(id) {
        let t = this.map.get(id);
        if (t === undefined) {
            return false;
        }
        this.fullitem.open(t);
        return true;
    }
}