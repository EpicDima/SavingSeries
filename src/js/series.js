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
    }

    createHtml() {
        return `<div id="item${this.data.id}" class="item-outer" onclick="onItemClick(${this.data.id})">
            <div class="item">
                <div class="image" style="background-image: url('${this.data.image}');"></div>
                <div class="gradient"></div>
                <div class="name">${this.data.name}</div>
            </div>
        </div>`;
    }

    delete() {
        // вызов какого-нибудь onDeleteListener
    }

    deleteHtml() {
        $(`#item${this.data.id}`).remove();
    }

    update(season, episode, date, site, image, status, note) {
        let changed = false;
        if (this.data.season !== season) {
            this.data.season = season;
        }
        if (this.data.episode !== episode) {
            this.data.episode = episode;
        }
        if (this.data.date !== date) {
            this.data.date = date;
            changed = true;
        }
        if (this.data.site !== site) {
            this.data.site = site;
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