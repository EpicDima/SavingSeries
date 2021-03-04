import {STATUS} from "./constants";
import {dateToLocaleString, hideElement, parseHtml, showElement} from "./common";

export default class Series {

    static onItemClickListener = () => {
        return false;
    };


    static validate(series) {
        if (series) {
            try {
                if (series.name !== "") {
                    let season = parseInt(series.season);
                    let episode = parseInt(series.episode);
                    if (season >= 1 && season <= 50 && episode >= 1 && episode <= 50000) {
                        return {
                            id: 0,
                            name: series.name,
                            season: season,
                            episode: episode,
                            date: series.date !== "" ? new Date(series.date) : "",
                            site: series.site !== "" ? series.site : "",
                            image: series.image ? /*Series.compressImage*/(series.image) : "",// chrome issue
                            note: series.note ? series.note : "",
                            status: series.status ? series.status : STATUS.RUN
                        };
                    }
                }
            } catch (e) {
            }
        }
        return null;
    }


    static create(series) {
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

        this.generate();
    }


    getFragment() {
        return this.item;
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.item = this.fragment.getElementById(`item${this.data.id}`);
        this.image = this.fragment.querySelector(".image");
        this.link = this.fragment.querySelector(".link");
        this.info = this.fragment.querySelector(".info");
        this.infoSeasonValue = this.info.querySelector(".season > .value");
        this.infoEpisodeValue = this.info.querySelector(".episode > .value");
        this.infoDate = this.info.querySelector(".date");
        this.infoDateValue = this.info.querySelector(".date > .value");

        this.item.onclick = () => Series.onItemClickListener(this.data.id);
        this.link.onclick = (e) => e.stopPropagation();

        this.updateInfo();
    }


    createHtml() {
        return `<div id="item${this.data.id}" class="item-outer">
            <div class="item">
                <div class="image" style="background-image: url('${this.data.image}');"></div>
                <div class="gradient"></div>
                <a class="link${this.data.site === "" ? " hide" : ""}" href="${this.data.site}" target="_blank" title="Переход на сайт"></a>
                <div class="info">
                    ${[["season", "Сезон"], ["episode", "Серия"], ["date", "Дата"]].map(item =>
                        `<div class="row ${item[0]}">
                            <div class="label">${item[1]}</div>
                            <div class="value"></div>
                        </div>`).join("")}
                </div>
                <div class="name" title="${this.data.name}">${this.data.name}</div>
            </div>
        </div>`;
    }


    updateInfo() {
        if (this.data.status === STATUS.COMPLETED) {
            hideElement(this.info);
            return;
        } else {
            showElement(this.info);
        }
        this.infoSeasonValue.innerText = this.data.season;
        this.infoEpisodeValue.innerText = this.data.episode;
        if (this.data.status === STATUS.JUST_WATCH) {
            hideElement(this.infoDate);
        } else {
            let date = dateToLocaleString(this);
            if (date === "") {
                hideElement(this.infoDate);
            } else {
                this.infoDateValue.innerText = date;
                showElement(this.infoDate);
            }
        }
    }


    static compressImage(image) {
        let img = document.createElement("img");
        img.src = image;
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.5);
    }


    updateImage() {
        if (this.data.image.length > 0) {
            this.data.image = Series.compressImage(this.data.image);
        }
        this.image.style.backgroundImage = `url("${this.data.image}")`;
    }


    updateLink() {
        if (this.data.site === "") {
            hideElement(this.link);
        } else {
            this.link.href = this.data.site;
            showElement(this.link);
        }
    }


    delete() {
        if (this.onDeleteListener !== null) {
            this.onDeleteListener();
        }
    }


    remove() {
        this.item.remove();
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
            this.updateInfo();
        }
        if (changed) {
            if (this.onUpdateListener !== null) {
                this.onUpdateListener();
            }
        }
        return changed;
    }
}
