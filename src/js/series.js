import {STATUS} from "./constants";
import {dateToLocaleString, hideElement, imageToCssUrl, isImage, roundToUtcDay, showElement} from "./common";
import Database from "./database";

// Картинку получает только карточка у экрана: разбор и декодирование всех сразу подвешивали страницу
const pendingImages = new WeakMap();
const imageObserver = new IntersectionObserver((entries) => {
    for (const {target, isIntersecting} of entries) {
        if (isIntersecting) {
            imageObserver.unobserve(target);
            target.style.backgroundImage = imageToCssUrl(pendingImages.get(target));
            pendingImages.delete(target);
        }
    }
}, {rootMargin: "200px", scrollMargin: "0px 100%"});

export default class Series {

    static #NAME_MAX_LENGTH = 256;
    static #SITE_MAX_LENGTH = 512;
    static #NOTE_MAX_LENGTH = 512;

    static onItemClickListener = () => {
        return false;
    };


    static validate(series) {
        if (typeof series?.name !== "string" || series.name.trim() === "") {
            return null;
        }
        const season = parseInt(series.season);
        const episode = parseInt(series.episode);
        if (!(season >= 1 && season <= 50 && episode >= 1 && episode <= 1_000_000)) {
            return null;
        }
        return {
            id: series.id,
            name: series.name.slice(0, Series.#NAME_MAX_LENGTH),
            season: season,
            episode: episode,
            date: parseDate(series.date),
            site: parseSite(series.site).slice(0, Series.#SITE_MAX_LENGTH),
            image: isImage(series.image) ? series.image : "",
            note: series.note ? String(series.note).slice(0, Series.#NOTE_MAX_LENGTH) : "",
            status: parseStatus(series.status)
        };
    }


    static create(series) {
        const validatedSeries = Series.validate(series);
        if (validatedSeries) {
            return new Series(series.id, validatedSeries.name, validatedSeries.season, validatedSeries.episode,
                validatedSeries.date, validatedSeries.site, validatedSeries.image, validatedSeries.status, validatedSeries.note);
        }
        return null;
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
        const template = document.getElementById("seriesTemplate");
        this.fragment = template.content.cloneNode(true);

        this.item = this.fragment.querySelector(".item-outer");

        this.image = this.fragment.querySelector(".image");

        this.link = this.fragment.querySelector(".link");

        this.info = this.fragment.querySelector(".info");
        this.infoSeasonValue = this.info.querySelector(".season > .value");
        this.infoEpisodeValue = this.info.querySelector(".episode > .value");
        this.infoDate = this.info.querySelector(".date");
        this.infoDateValue = this.info.querySelector(".date > .value");

        const nameElement = this.fragment.querySelector(".name");
        nameElement.title = this.data.name;
        nameElement.textContent = this.data.name;

        this.item.onclick = () => Series.onItemClickListener(this.data.id);
        this.link.onclick = (e) => e.stopPropagation();

        this.updateLink();
        this.showImage();
        this.updateInfo();
        window.i18n.applyTo(this.item);
    }

    retranslate() {
        window.i18n.applyTo(this.item);
        this.updateInfo();
    }

    updateInfo() {
        if (this.data.status === STATUS.COMPLETED) {
            hideElement(this.info);
            return;
        } else {
            showElement(this.info);
        }
        this.infoSeasonValue.textContent = this.data.season;
        this.infoEpisodeValue.textContent = this.data.episode;
        if (this.data.status === STATUS.JUST_WATCH) {
            hideElement(this.infoDate);
        } else {
            let date = dateToLocaleString(this.data.date);
            if (date === "") {
                hideElement(this.infoDate);
            } else {
                this.infoDateValue.textContent = date;
                showElement(this.infoDate);
            }
        }
    }


    static compressImage(image) {
        const worker = new Worker(new URL("./compression.worker.js", import.meta.url));
        return new Promise((resolve) => {
            worker.onmessage = (event) => resolve(event.data ?? image);
            worker.onerror = (error) => {
                console.error("Image compression failed:", error);
                resolve(image);
            };
            worker.postMessage(image);
        }).finally(() => worker.terminate());
    }

    async loadImageAsync() {
        if (!this.data.image) {
            const database = Database.getInstance();
            const image = await database.getSeriesImage(this.data.id);
            if (isImage(image)) {
                this.data.image = image;
                this.showImage();
            } else if (image !== undefined) {
                database.deleteSeriesImage(this.data.id);
            }
        }
    }

    showImage() {
        if (this.data.image) {
            pendingImages.set(this.image, this.data.image);
            imageObserver.observe(this.image);
        } else {
            this.stopImageObserving();
            this.image.style.backgroundImage = "";
        }
    }

    stopImageObserving() {
        imageObserver.unobserve(this.image);
        pendingImages.delete(this.image);
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
        this.stopImageObserving();
        this.item.remove();
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
        if (!areDatesEqual(this.data.date, date)) {
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
            this.showImage();
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


function parseDate(value) {
    const date = value ? new Date(value) : null;
    return date && !isNaN(date) ? roundToUtcDay(date) : "";
}


function parseStatus(value) {
    const status = String(value);
    return Object.values(STATUS).includes(status) ? status : STATUS.RUN;
}


function parseSite(value) {
    const site = value ? String(value).trim() : "";
    if (site === "" || /^https?:\/\//i.test(site)) {
        return site;
    }
    // Двоеточие с цифрами после — порт, а не схема: "example.com:8080"
    return /^[a-z][a-z\d+.-]*:(?!\d)/i.test(site) ? "" : `https://${site}`;
}


function areDatesEqual(date1, date2) {
    if (date1 === "" || date2 === "") {
        return date1 === date2;
    }
    return date1.getTime() === date2.getTime();
}
