import {getStatusOptionsHtml, STATUS_STRING} from "./constants";
import {dateToLocaleString, dateInputStringToObject, dateObjectToInputString, createLinkElement, getSeriesListType} from "./common";
import Database from "./database";



export default class FullItem {
    constructor(id) {
        this.id = id;
        this.fields = null;
        this.buttons = null;
        this.database = new Database();
    }

    createHtml() {
        return `<div id="fullitem${this.id}" class="collapse">
            <div class="fullitem">
                <div id="closeButton${this.id}" class="fullitem-close">
                    <button type="button" class="close" aria-label="Close">
                        <span aria-hidden="true">&#10006;</span>
                    </button>
                </div>
                <div id="imageValue${this.id}" class="image"></div>
                <div class="gradient"></div>
                <div id="name${this.id}" class="name"></div>
                <div class="content">
                    <form onsubmit="return false;">
                        <div id="season${this.id}" class="row">
                            <div class="col-3 label">Сезон</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><input name="season" type="number"/></div>
                        </div>
                        <div id="episode${this.id}" class="row">
                            <div class="col-3 label">Серия</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><input name="episode" type="number"/></div>
                        </div>
                        <div id="date${this.id}" class="row">
                            <div class="col-3 label">Дата</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><input name="date" type="date"/></div>
                        </div>
                        <div id="site${this.id}" class="row">
                            <div class="col-3 label">Сайт</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><input name="site" type="url"/></div>
                        </div>
                        <div id="image${this.id}" class="row">
                            <div class="col-3 label">Изображение</div>
                            <div class="col-5 input"><input name="image" type="file"/></div>
                        </div>
                        <div id="status${this.id}" class="row">
                            <div class="col-3 label">Статус</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><select name="status">${getStatusOptionsHtml()}</select></div>
                        </div>
                        <div id="note${this.id}" class="row">
                            <div class="col-3 label">Заметки</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input"><textarea name="note" rows="2"></textarea></div>
                        </div>
                    </form>
                </div>
                <div class="button-container row">
                    <div id="changeButton${this.id}" class="col-3 change-button"><button>Редактировать</button></div>
                    <div id="cancelButton${this.id}" class="col-3 cancel-button"><button>Отмена</button></div>
                    <div id="acceptButton${this.id}" class="col-3 accept-button"><button>Подтвердить</button></div>
                    <div id="deleteButton${this.id}" class="col-3 delete-button"><button>Удалить</button></div>
                </div>
            </div>
        </div>`;
    }

    getFields() {
        if (this.fields === null) {
            this.fields = {
                name: $(`#name${this.id}`),
                season: {
                    value: $(`#season${this.id} .value`),
                    input: $(`#season${this.id} input`)
                },
                episode: {
                    value: $(`#episode${this.id} .value`),
                    input: $(`#episode${this.id} input`)
                },
                date: {
                    value: $(`#date${this.id} .value`),
                    input: $(`#date${this.id} input`)
                },
                site: {
                    value: $(`#site${this.id} .value`),
                    input: $(`#site${this.id} input`)
                },
                image: {
                    value: $(`#imageValue${this.id}`),
                    input: $(`#image${this.id} input`)
                },
                status: {
                    value: $(`#status${this.id} .value`),
                    input: $(`#status${this.id} select`)
                },
                note: {
                    value: $(`#note${this.id} .value`),
                    input: $(`#note${this.id} textarea`)
                }
            };
        }
        return this.fields;
    }

    getButtons() {
        if (this.buttons === null) {
            this.buttons = {
                change: {
                    div: $(`#changeButton${this.id}`),
                    button: $(`#changeButton${this.id} button`)
                },
                cancel: {
                    div: $(`#cancelButton${this.id}`),
                    button: $(`#cancelButton${this.id} button`)
                },
                accept: {
                    div: $(`#acceptButton${this.id}`),
                    button: $(`#acceptButton${this.id} button`)
                },
                delete: {
                    div: $(`#deleteButton${this.id}`),
                    button: $(`#deleteButton${this.id} button`)
                },
                close: {
                    div: $(`#closeButton${this.id}`),
                    button: $(`#closeButton${this.id} button`)
                }
            }
        }
        return this.buttons;
    }

    setListeners() {
        this.buttons.change.button.click(() => this.change());
        this.buttons.cancel.button.click(() => this.cancel());
        this.buttons.accept.button.click(() => this.accept());
        this.buttons.delete.button.click(() => this.delete());
        this.buttons.close.button.click(() => this.close());
        this.fields.image.input.change(() => this.changeImage());
    }

    open(series) {
        // if (this.series) {
        //     if (this.series.data.id === series.data.id) {
        //         this.close();
        //         return;
        //     }
        // }
        $(`.collapse:not(#fullitem${this.id})`).collapse("hide");
        this.showInputs(false);
        this.setSeries(series);
        this.getButtons();
        this.getFields();
        this.setListeners();
        this.showButtonChange();
        let element = $(`#fullitem${this.id}`);
        element.on("shown.bs.collapse", () => element[0].scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"}));
        element.collapse("show");
    }

    close() {
        this.series = null;
        $(`#fullitem${this.id}`).collapse("hide");
    }

    setSeries(series) {
        this.series = series;
        this.setDisplayValues(series);
        this.setInputValues(series);
    }

    setDisplayValues(series) {
        this.getFields();
        this.fields.name.html(series.data.name);
        this.fields.season.value.html(series.data.season);
        this.fields.episode.value.html(series.data.episode);
        this.fields.date.value.html(dateToLocaleString(series.data.date));
        this.fields.site.value.html(createLinkElement(series.data.site));
        this.fields.image.value.css("background-image", `url("${series.data.image}")`);
        this.fields.status.value.html(STATUS_STRING.get(series.data.status));
        this.fields.note.value.html(series.data.note);
    }

    setInputValues(series) {
        this.getFields();
        this.fields.season.input.val(series.data.season);
        this.fields.episode.input.val(series.data.episode);
        this.fields.date.input.val(dateObjectToInputString(series.data.date));
        this.fields.site.input.val(series.data.site);
        this.fields.image.input.val("");
        this.fields.status.input.val(series.data.status);
        this.fields.note.input.html(series.data.note);
    }

    showButtonChange() {
        this.buttons.change.div.show();
        this.buttons.cancel.div.hide();
        this.buttons.accept.div.hide();
        this.buttons.delete.div.hide();
    }

    showInputs(show) {
        let valueElements = $(`#fullitem${this.id} .value`);
        let inputElements = $(`#fullitem${this.id} .input`);
        if (show) {
            valueElements.hide();
            inputElements.show();
        } else {
            valueElements.show();
            inputElements.hide();
        }
    }

    change() {
        this.showInputs(true);
        this.buttons.change.div.hide();
        this.buttons.cancel.div.show();
        this.buttons.accept.div.show();
        this.buttons.delete.div.show();
    }

    cancel() {
        this.showInputs(false);
        this.showButtonChange();
        this.fields.image.value.css("background-image", `url("${this.series.data.image}")`);
        this.setInputValues(this.series);
    }

    accept() {
        this.getFields();
        let season = this.fields.season.input.val();
        let episode = this.fields.episode.input.val();
        let date = dateInputStringToObject(this.fields.date.input.val());
        let site = this.fields.site.input.val();
        let image = this.fields.image.value.css("background-image").slice(4, -1).replace(/"/g, "");
        let status = this.fields.status.input.val();
        let note = this.fields.note.input.html();
        let changed = this.series.update(season, episode, date, site, image, status, note);
        this.database.putSeriesInDb(this.series);

        if (changed) {
            if (getSeriesListType(this.series) !== this.id) {
                this.close();
                return;
            }
        }

        this.setDisplayValues(this.series);
        this.showInputs(false);
        this.showButtonChange();
    }

    delete() {
        if (confirm(`Вы действительно хотите удалить "${this.series.data.name}"?`)) {
            this.series.delete();
            this.database.deleteSeriesInDb(this.series);
            this.close();
        }
    }

    changeImage() {
        let reader = new FileReader();
        let value = this.fields.image.value;
        reader.onload = function() {
            value.css("background-image", `url("${reader.result}")`);
        };
        reader.onerror = function() {
            console.log(reader.error);
        };
        reader.readAsDataURL(this.fields.image.input[0].files[0]); // конвертирует Blob в base64 и вызывает onload
    }
}