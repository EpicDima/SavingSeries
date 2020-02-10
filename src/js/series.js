export default class Series {

    static createSeries(series) {
        return new Series(series.id, series.name, series.season, series.episode,
            series.date, series.site, series.note, series.status, series.image);
    }

    constructor(id, name, season, episode, date, site, note, status, image) {
        this.id = id;
        this.name = name;
        this.season = season;
        this.episode = episode;
        this.date = date;
        this.site = site;
        this.note = note;
        this.status = status;
        this.image = image;
    }

    createHtml() {
        return `<div id="item${this.id}" class="item-outer" onclick="onItemClick(${this.id})">
            <div class="item">
                <div class="image" style="background-image: url('${this.image}');"></div>
                <div class="gradient"></div>
                <div class="name">${this.name}</div>
            </div>
        </div>`;
    }

    deleteHtml() {
        $(`item${this.id}`).delete();
    }
}