import {STATUS} from "./constants";
import {dateToLocaleString} from "./common";

export default class Series {

    static createSeries(series) {
        return new Series(series.id, series.name, series.season, series.episode,
            series.date, series.site, series.image, series.status, series.note);
    }

    constructor(id, name, season, episode, date, site, image, status, note) {
        this.data = {
            id: id,
            name: name,
            season: season,
            episode: episode,
            date: date,
            site: site,
            image: image,
            status: status,
            note: note
        };
        this.onUpdateListener = null;
        this.onDeleteListener = null;
    }

    createHtml() {
        return `<div id="item${this.data.id}" class="item-outer" onclick="onItemClick(${this.data.id})">
            <div class="item">
                <div class="image" style="background-image: url('${this.data.image}');"></div>
                <div class="gradient"></div>
                <a class="link" href="${this.data.site}" target="_blank" onclick="event.stopPropagation();"></a>
                <div class="info">${this.getInfoPart()}</div>
                <div class="name">${this.data.name}</div>
            </div>
        </div>`;
    }

    getInfoPart() {
        if (this.data.status === STATUS.COMPLETED) {
            return "";
        }
        let html = `<div class="row">
            <div class="label">Сезон</div>
            <div class="value">${this.data.season}</div>
        </div>
        <div class="row">
            <div class="label">Серия</div>
            <div class="value">${this.data.episode}</div>
        </div>`;
        if (this.data.status !== STATUS.JUST_WATCH) {
            let date = dateToLocaleString(this);
            if (date !== "") {
                html += `<div class="row">
                    <div class="label">Дата</div>
                    <div class="value">${date}</div>
                </div>`;
            }
        }
        return html;
    }

    getItemElement() {
        return $(`#item${this.data.id} > .item`);
    }

    updateInfoPart() {
        $(`#item${this.data.id} .info`).html(this.getInfoPart());
    }

    updateLink() {
        $(`#item${this.data.id} .link`).attr("href", this.data.site);
    }

    delete() {
        if (this.onDeleteListener !== null) {
            this.onDeleteListener();
        }
    }

    deleteHtml() {
        $(`#item${this.data.id}`).remove();
    }

    compareDates(date1, date2) {
        if (date1 === "" && date2 === "") {
            return true;
        } else if (date1 === "" || date2 === "") {
            return false;
        } else {
            return date1.getTime() === date2.getTime();
        }
    }

    update(season, episode, date, site, image, status, note) {
        let changed = false;
        let changedInfo = false;
        if (this.data.season !== season) {
            this.data.season = season;
            changedInfo = true;
        }
        if (this.data.episode !== episode) {
            this.data.episode = episode;
            changedInfo = true;
        }
        if (!this.compareDates(this.data.date, date)) {
            this.data.date = date;
            changed = true;
            changedInfo = true;
        }
        if (this.data.site !== site) {
            this.data.site = site;
            this.updateLink();
        }
        if (this.data.image !== image) {
            this.data.image = image;
            this.updateImage();
        }
        if (this.data.status !== status) {
            this.data.status = status;
            changed = true;
        }
        if (this.data.note !== note) {
            this.data.note = note;
        }
        if (changedInfo) {
            this.updateInfoPart();
        }
        if (changed) {
            if (this.onUpdateListener !== null) {
                this.onUpdateListener();
            }
        }
        return changed;
    }

    updateImage() {
        let elems = $(`#item${this.data.id} .image`);
        elems.css("background-image", `url("${this.data.image}")`);
    }
}