import {getStatusOptionsHtml, STATUS, STATUS_STRING} from "./constants";
import {dateToLocaleString, dateInputStringToObject, dateObjectToInputString, createLinkElement, getSeriesListType} from "./common";
import Database from "./database";
import Series from "./series";


export class BaseFullItem {
    constructor(id, needName = true) {
        this.id = id;
        this.needName = needName;
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
                ${this.needName ? `<div id="name${this.id}" class="name-title"></div>` : ""}
                <div class="content">
                    <form onsubmit="return false;">
                        ${this.getInputsHtml()}
                        <div id="season${this.id}" class="row">
                            <div class="col-3 label">Сезон</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <input class="fullitem-input" name="season" type="number" value="1" min="1" max="50" required/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="season"></label>
                                </div>
                            </div>
                        </div>
                        <div id="episode${this.id}" class="row">
                            <div class="col-3 label">Серия</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <input class="fullitem-input" name="episode" type="number" value="1" min="1" max="50000" required/>
                            </div>
                        </div>
                        <div id="date${this.id}" class="row">
                            <div class="col-3 label">Дата</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <input class="fullitem-input" name="date" type="date"/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="date"></label>
                                </div>
                            </div>
                        </div>
                        <div id="site${this.id}" class="row">
                            <div class="col-3 label">Сайт</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <input class="fullitem-input" name="site" type="url" required/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="site"></label>
                                </div>
                            </div>
                        </div>
                        <div id="image${this.id}" class="row">
                            <div class="col-3 label">Изображение</div>
                            <div class="col-5 input">
                                <input class="fullitem-input" name="image" type="file" accept="image/*"/>
                            </div>
                        </div>
                        <div id="status${this.id}" class="row">
                            <div class="col-3 label">Статус</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <select class="fullitem-input" name="status">${getStatusOptionsHtml()}</select>
                            </div>
                        </div>
                        <div id="note${this.id}" class="row">
                            <div class="col-3 label">Заметки</div>
                            <div class="col-8 value"></div>
                            <div class="col-5 input">
                                <textarea class="fullitem-input" name="note" rows="2" maxlength="200"></textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="button-container row">
                    ${this.getButtonContainerInnerHtml()}
                </div>
            </div>
        </div>`;
    }

    getInputsHtml() {
        return "";
    }

    getButtonContainerInnerHtml() {
        return "";
    }

    getFields() {
        if (this.fields === null) {
            this.fields = {
                season: {
                    div: $(`#season${this.id}`),
                    value: $(`#season${this.id} .value`),
                    input: $(`#season${this.id} input`)
                },
                episode: {
                    div: $(`#episode${this.id}`),
                    value: $(`#episode${this.id} .value`),
                    input: $(`#episode${this.id} input`)
                },
                date: {
                    div: $(`#date${this.id}`),
                    value: $(`#date${this.id} .value`),
                    input: $(`#date${this.id} input`)
                },
                site: {
                    div: $(`#site${this.id}`),
                    value: $(`#site${this.id} .value`),
                    input: $(`#site${this.id} input`)
                },
                image: {
                    div: $(`#image${this.id}`),
                    value: $(`#imageValue${this.id}`),
                    input: $(`#image${this.id} input`)
                },
                status: {
                    div: $(`#status${this.id}`),
                    value: $(`#status${this.id} .value`),
                    input: $(`#status${this.id} select`)
                },
                note: {
                    div: $(`#note${this.id}`),
                    value: $(`#note${this.id} .value`),
                    input: $(`#note${this.id} textarea`)
                }
            };
        }
        return this.fields;
    }

    open() {
        $(`.collapse:not(#fullitem${this.id})`).collapse("hide");
        $(`#fullitem${this.id} form`).validate().resetForm();
        $(`#fullitem${this.id} input`).removeClass("error");
        this.showInputs(false);
        this.getButtons();
        this.getFields();
        this.setListeners();
        this.onChangeStatus();
        let element = $(`#fullitem${this.id}`);
        element.on("shown.bs.collapse", () => element[0].scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"}));
        element.collapse("show");
    }

    close() {
        $(`#fullitem${this.id}`).collapse("hide");
    }

    setListeners() {
        this.buttons.close.button.click(() => this.close());
        this.fields.image.input.change(() => this.changeImage());
        this.fields.status.input.change(() => this.onChangeStatus());
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

    getStatusState() {
        let status = this.fields.status.input.val();
        let visibilityState = {season: true, episode: true, date: true}; // STATUS.RUN, STATUS.PAUSE
        switch (status) {
            case STATUS.COMPLETED:
                visibilityState.season = false;
                visibilityState.episode = false;
                visibilityState.date = false;
                break;
            case STATUS.JUST_WATCH:
                visibilityState.date = false;
                break;
        }
        return visibilityState;
    }

    onChangeStatus() {
        let visibilityState = this.getStatusState();
        if (visibilityState.season) {
            this.fields.season.div.removeClass("hidden");
        } else {
            this.fields.season.div.addClass("hidden");
        }
        if (visibilityState.episode) {
            this.fields.episode.div.removeClass("hidden");
        } else {
            this.fields.episode.div.addClass("hidden");
        }
        if (visibilityState.date) {
            this.fields.date.div.removeClass("hidden");
        } else {
            this.fields.date.div.addClass("hidden");
        }
    }

    showInputs(show) {
        let valueElements = $(`#fullitem${this.id} .value`);
        let inputElements = $(`#fullitem${this.id} .input`);
        if (show) {
            valueElements.addClass("hidden");
            inputElements.removeClass("hidden");
        } else {
            valueElements.removeClass("hidden");
            inputElements.addClass("hidden");
        }
    }

    getButtons() {
        if (this.buttons === null) {
            this.buttons = {
                close: {
                    div: $(`#closeButton${this.id}`),
                    button: $(`#closeButton${this.id} button`)
                }
            }
        }
        return this.buttons;
    }

    setDisplayValues(series) {
        this.fields.name.value.html(series ? series.data.name : "");
        this.fields.season.value.html(series ? series.data.season : "");
        this.fields.episode.value.html(series ? series.data.episode : "");
        this.fields.date.value.html(dateToLocaleString(series));
        this.fields.site.value.html(createLinkElement(series.data.site));
        this.fields.image.value.css("background-image", `url("${series ? series.data.image : ""}")`);
        this.fields.status.value.html(STATUS_STRING.get(series ? series.data.status : STATUS.RUN));
        this.fields.note.value.html(series ? series.data.note : "");
    }

    setInputValues(series) {
        this.fields.season.input.val(series ? series.data.season : "");
        this.fields.episode.input.val(series ? series.data.episode : "");
        this.fields.date.input.val(dateObjectToInputString(series));
        this.fields.site.input.val(series ? series.data.site : "");
        this.fields.image.input.val("");
        this.fields.status.input.val(series ? series.data.status : "");
        this.fields.note.input.val(series ? series.data.note : "");
    }

    resetInputValues() {
        this.fields.season.input.val("1");
        this.fields.episode.input.val("1");
        this.fields.date.input.val("");
        this.fields.site.input.val("");
        this.fields.image.input.val("");
        this.fields.status.input.val(STATUS.RUN);
        this.fields.note.input.val("");
    }

    checkInputs() {
        let statusState = this.getStatusState();
        if (statusState.season) {
            if (!this.fields.season.input.valid()) {
                return false;
            }
        }
        if (statusState.episode) {
            if (!this.fields.episode.input.valid()) {
                return false;
            }
        }
        if (statusState.date) {
            if (!this.fields.date.input.valid()) {
                return false;
            }
        }
        return !(!this.fields.site.input.valid() || !this.fields.image.input.valid()
            || !this.fields.image.input.valid() || !this.fields.status.input.valid()
            || !this.fields.note.input.valid());
    }
}


export class FullItem extends BaseFullItem {
    constructor(id = 0) {
        super(id);
    }

    getButtonContainerInnerHtml() {
        return `<div id="changeButton${this.id}" class="col-3 change-button"><button>Редактировать</button></div>
            <div id="cancelButton${this.id}" class="col-3 cancel-button"><button>Отмена</button></div>
            <div id="acceptButton${this.id}" class="col-5 accept-button"><button>Подтвердить</button></div>
            <div id="deleteButton${this.id}" class="col-3 delete-button"><button>Удалить</button></div>`;
    }

    getFields() {
        if (this.fields === null) {
            super.getFields();
            this.fields.name = {
                value: $(`#name${this.id}`)
            };
        }
        return this.fields;
    }

    getButtons() {
        if (this.buttons === null) {
            super.getButtons();
            this.buttons.change = {
                div: $(`#changeButton${this.id}`),
                button: $(`#changeButton${this.id} button`)
            };
            this.buttons.cancel = {
                div: $(`#cancelButton${this.id}`),
                button: $(`#cancelButton${this.id} button`)
            };
            this.buttons.accept = {
                div: $(`#acceptButton${this.id}`),
                button: $(`#acceptButton${this.id} button`)
            };
            this.buttons.delete = {
                div: $(`#deleteButton${this.id}`),
                button: $(`#deleteButton${this.id} button`)
            };
        }
        return this.buttons;
    }

    setListeners() {
        super.setListeners();
        this.buttons.change.button.click(() => this.change());
        this.buttons.cancel.button.click(() => this.cancel());
        this.buttons.accept.button.click(() => this.accept());
        this.buttons.delete.button.click(() => this.delete());
    }

    showAllFields() {
        this.fields.season.div.removeClass("hidden");
        this.fields.episode.div.removeClass("hidden");
        this.fields.date.div.removeClass("hidden");
        this.fields.site.div.removeClass("hidden");
        this.fields.image.div.removeClass("hidden");
        this.fields.status.div.removeClass("hidden");
        this.fields.note.div.removeClass("hidden");
    }

    hideEmptyFields() {
        this.fields.image.div.addClass("hidden");
        if (this.series.data.date === "") {
            this.fields.date.div.addClass("hidden");
        }
        if (this.series.data.note === "") {
            this.fields.note.div.addClass("hidden");
        }
    }

    open(series) {
        // if (this.series) {
        //     if (this.series.data.id === series.data.id) {
        //         this.close();
        //         return;
        //     }
        // }

        super.open();
        this.setSeries(series);
        this.showButtonChange();
        this.showAllFields();
        this.onChangeStatus();
        this.hideEmptyFields();
    }

    close() {
        this.series = null;
        super.close();
    }

    setSeries(series) {
        this.series = series;
        this.setDisplayValues(series);
        this.setInputValues(series);
    }

    showButtonChange() {
        this.buttons.change.div.removeClass("hidden");
        this.buttons.cancel.div.addClass("hidden");
        this.buttons.accept.div.addClass("hidden");
        this.buttons.delete.div.addClass("hidden");
    }

    change() {
        this.showInputs(true);
        this.showAllFields();
        this.buttons.change.div.addClass("hidden");
        this.buttons.cancel.div.removeClass("hidden");
        this.buttons.accept.div.removeClass("hidden");
        this.buttons.delete.div.removeClass("hidden");
    }

    cancel() {
        this.showInputs(false);
        this.showButtonChange();
        this.fields.image.value.css("background-image", `url("${this.series.data.image}")`);
        this.setInputValues(this.series);
        this.onChangeStatus();
        this.hideEmptyFields();
    }

    accept() {
        if (!this.checkInputs()) {
            return;
        }
        let season = this.fields.season.input.val();
        let episode = this.fields.episode.input.val();
        let date = dateInputStringToObject(this.fields.date.input.val());
        let site = this.fields.site.input.val();
        let backgroundImage = this.fields.image.value.css("background-image");
        let image = backgroundImage.length > 5 ? backgroundImage.slice(4, -1).replace(/"/g, "") : this.series.data.image;
        let status = this.fields.status.input.val();
        let note = this.fields.note.input.val();
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
}


export class AddingFullItem extends BaseFullItem {
    constructor(id, showSeries) {
        super(id, false);
        this.showSeries = showSeries;
        this.seriesId = 0;
    }

    getInputsHtml() {
        return `<div id="name${this.id}" class="row">
            <div class="col-3 label">Название</div>
            <div class="col-8 value"></div>
            <div class="col-5 input">
                <input class="fullitem-input" name="name" type="text" minlength="1" maxlength="100" required/>
                <div class="invalid-tooltip">
                    <label class="error" for="name"></label>
                </div>
            </div>
        </div>`;
    }

    getButtonContainerInnerHtml() {
        return `<div id="addButton${this.id}" class="col-3 add-button"><button>Добавить</button></div>`;
    }

    setSeriesId(seriesId) {
        this.seriesId = seriesId;
    }

    getFields() {
        if (this.fields === null) {
            super.getFields();
            this.fields.name = {
                value: $(`#name${this.id} .value`),
                input: $(`#name${this.id} input`)
            };
        }
        return this.fields;
    }

    getButtons() {
        if (this.buttons === null) {
            super.getButtons();
            this.buttons.add = {
                div: $(`#addButton${this.id}`),
                button: $(`#addButton${this.id} button`)
            };
        }
        return this.buttons;
    }

    setListeners() {
        super.setListeners();
        this.buttons.add.button.click(() => this.add());
    }

    resetInputValues() {
        this.fields.name.input.val("");
        super.resetInputValues();
    }

    open() {
        super.open();
        this.resetInputValues();
        this.showInputs(true);
    }

    checkInputs() {
        if (!this.fields.name.input.valid()) {
            return false;
        }
        return super.checkInputs();
    }

    add() {
        if (!this.checkInputs()) {
            return;
        }
        let name = this.fields.name.input.val();
        let season = this.fields.season.input.val();
        let episode = this.fields.episode.input.val();
        let date = dateInputStringToObject(this.fields.date.input.val());
        let site = this.fields.site.input.val();
        let backgroundImage = this.fields.image.value.css("background-image");
        let image = backgroundImage.length > 5 ? backgroundImage.slice(4, -1).replace(/"/g, "") : this.series.data.image;
        let status = this.fields.status.input.val();
        let note = this.fields.note.input.val();

        let series = new Series(this.seriesId++, name, season, episode, date, site, image, status, note);
        this.database.putSeriesInDb(series);
        this.close();
        this.showSeries(series);
    }
}
