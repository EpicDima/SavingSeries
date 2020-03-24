import {getStatusOptionsHtml, STATUS} from "./constants";
import {dateToLocaleString, dateInputStringToObject, dateObjectToInputString, createLinkElement, getSeriesListType} from "./common";
import Database from "./database";
import Series from "./series";


export class BaseFullItem {
    constructor(id, needTop = true) {
        this.id = id;
        this.needTop = needTop;
        this.fields = null;
        this.buttons = null;
        this.database = new Database();
    }

    createHtml() {
        return `<div id="fullitem${this.id}" class="fullitem">
            <div id="closeButton${this.id}" class="outer-close">
                <span class="close">&#10006;</span>
            </div>
            <div class="background">
                <div id="imageValue${this.id}" class="image"></div>
                <div class="gradient"></div>
            </div>
            <div class="content">
                ${this.getTop()}
                <div class="general">
                    <form class="input-container" onsubmit="return false;">
                        ${this.getInputsHtml()}
                        <div id="statusRow${this.id}" class="row on-edit">
                            <div class="label">Статус</div>
                            ${this.needTop ? "" : `<div id="statusValue${this.id}" class="value"></div>`}
                            <div class="input">
                                <label>
                                    <select class="fullitem-input" name="status">
                                        ${getStatusOptionsHtml()}
                                    </select>
                                </label>
                            </div>
                        </div>
                        <div id="seasonRow${this.id}" class="row">
                            <div class="label">Сезон</div>
                            <div class="value not-on-edit"></div>
                            <div class="input on-edit">
                                <input id="season${this.id}" class="fullitem-input" name="season" type="number" value="1" min="1" max="50" required/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="season${this.id}"></label>
                                </div>
                            </div>
                        </div>
                        <div id="episodeRow${this.id}" class="row">
                            <div class="label">Серия</div>
                            <div class="value not-on-edit"></div>
                            <div class="input on-edit">
                                <input id="episode${this.id}" class="fullitem-input" name="episode" type="number" value="1" min="1" max="50000" required/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="episode${this.id}"></label>
                                </div>
                            </div>
                        </div>
                        <div id="dateRow${this.id}" class="row">
                            <div class="label">Дата</div>
                            <div class="value not-on-edit"></div>
                            <div class="input on-edit">
                                <input id="date${this.id}" class="fullitem-input" name="date" type="date"/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="date${this.id}"></label>
                                </div>
                            </div>
                        </div>
                        <div id="siteRow${this.id}" class="row">
                            <div class="label">Сайт</div>
                            <div class="value not-on-edit"></div>
                            <div class="input on-edit">
                                <input id="site${this.id}" class="fullitem-input" name="site" type="url" maxlength="1024" required/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="site${this.id}"></label>
                                </div>
                            </div>
                        </div>
                        <div id="imageRow${this.id}" class="row on-edit">
                            <div class="label">Изображение</div>
                            <div class="input">
                                <input class="fullitem-input" name="image" type="file" accept="image/*"/>
                            </div>
                        </div>
                        <div id="noteRow${this.id}" class="row">
                            <div class="label">Заметки</div>
                            <div class="value not-on-edit"></div>
                            <div class="input on-edit">
                                <label>
                                    <textarea class="fullitem-input" name="note" rows="3" maxlength="200"></textarea>
                                </label>
                            </div>
                        </div>
                    </form>
                    <div class="row button-container">
                        ${this.getButtonContainerInnerHtml()}
                    </div>
                </div>
            </div>
        </div>`;
    }

    getTop() {
        if (this.needTop) {
            return `<div class="top">
                <div id="nameTitle${this.id}" class="name-title">Игра престолов</div>
            </div>`;
        }
        return "";
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
                    div: $(`#seasonRow${this.id}`),
                    value: $(`#seasonRow${this.id} .value`),
                    input: $(`#seasonRow${this.id} input`)
                },
                episode: {
                    div: $(`#episodeRow${this.id}`),
                    value: $(`#episodeRow${this.id} .value`),
                    input: $(`#episodeRow${this.id} input`)
                },
                date: {
                    div: $(`#dateRow${this.id}`),
                    value: $(`#dateRow${this.id} .value`),
                    input: $(`#dateRow${this.id} input`)
                },
                site: {
                    div: $(`#siteRow${this.id}`),
                    value: $(`#siteRow${this.id} .value`),
                    input: $(`#siteRow${this.id} input`)
                },
                image: {
                    div: $(`#imageRow${this.id}`),
                    value: $(`#imageValue${this.id}`),
                    input: $(`#imageRow${this.id} input`)
                },
                status: {
                    div: $(`#statusRow${this.id}`),
                    input: $(`#statusRow${this.id} select`)
                },
                note: {
                    div: $(`#noteRow${this.id}`),
                    value: $(`#noteRow${this.id} .value`),
                    input: $(`#noteRow${this.id} textarea`)
                }
            };
        }
        return this.fields;
    }

    open() {
        $(`.fullitem:not(#fullitem${this.id})`).slideUp("fast");
        $(`#fullitem${this.id} form`).validate().resetForm();
        $(`#fullitem${this.id} input`).removeClass("error");

        this.getButtons();
        this.getFields();
        this.setListeners();

        let element = $(`#fullitem${this.id}`);
        element.slideDown("fast", () => {
            element[0].scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
        });
    }

    clearActiveItems() {
        $(`.item-outer.active`).removeClass("active");
    }

    turnOnActiveItem() {
        this.clearActiveItems();
    }

    close() {
        $(`#fullitem${this.id}`).slideUp("fast");
    }

    remove() {
        $(`#fullitem${this.id}`).remove();
    }

    setListeners() {
        this.buttons.close.button[0].onclick = () => this.close();
        this.fields.image.input[0].onchange = () => this.changeImage();
        this.fields.status.input[0].onchange = () => this.onChangeStatus();
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
            this.fields.season.div.removeClass("hide");
        } else {
            this.fields.season.div.addClass("hide");
        }
        if (visibilityState.episode) {
            this.fields.episode.div.removeClass("hide");
        } else {
            this.fields.episode.div.addClass("hide");
        }
        if (visibilityState.date) {
            this.fields.date.div.removeClass("hide");
        } else {
            this.fields.date.div.addClass("hide");
        }
    }

    showEditFields(show) {
        let onEditElements = $(`#fullitem${this.id} .on-edit`);
        let notOnEditElements = $(`#fullitem${this.id} .not-on-edit`);
        if (show) {
            onEditElements.removeClass("hide");
            notOnEditElements.addClass("hide");
        } else {
            onEditElements.addClass("hide");
            notOnEditElements.removeClass("hide");
        }
    }

    getButtons() {
        if (this.buttons === null) {
            this.buttons = {
                close: {
                    div: $(`#closeButton${this.id}`),
                    button: $(`#closeButton${this.id} span`)
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
        this.fields.image.value.css("background-image", "");
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

    getValuesFromInputs() {
        if (!this.checkInputs()) {
            return;
        }
        let season = this.fields.season.input.val();
        let episode = this.fields.episode.input.val();
        let date = dateInputStringToObject(this.fields.date.input.val());
        let site = this.fields.site.input.val();
        let backgroundImage = this.fields.image.value.css("background-image");
        let status = this.fields.status.input.val();
        let note = this.fields.note.input.val();
        return {season: season, episode: episode, date: date, site: site,
                backgroundImage: backgroundImage, status: status, note: note};
    }
}


export class FullItem extends BaseFullItem {
    constructor(hContainer) {
        super(hContainer.id);
        this.hContainer = hContainer;
    }

    getButtonContainerInnerHtml() {
        return `<div id="changeButton${this.id}" class="change-button not-on-edit">
            <button>Редактировать</button>
        </div>
        <div id="updateButton${this.id}" class="update-button not-on-edit">
            <button>Следующая</button>
            <div class="tooltip">Увеличивает серию на 1, дату на неделю</div>
        </div>
        <div id="cancelButton${this.id}" class="cancel-button on-edit">
            <button>Отмена</button>
        </div>
        <div id="acceptButton${this.id}" class="accept-button on-edit">
            <button>Подтвердить</button>
        </div>
        <div id="deleteButton${this.id}" class="delete-button on-edit">
            <button>Удалить</button>
        </div>`;
    }

    getFields() {
        if (this.fields === null) {
            super.getFields();
            this.fields.name = {
                value: $(`#nameTitle${this.id}`)
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
            this.buttons.update = {
                div: $(`#updateButton${this.id}`),
                button: $(`#updateButton${this.id} button`)
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
        this.buttons.change.button[0].onclick = () => this.change();
        this.buttons.update.button[0].onclick = () => this.update();
        this.buttons.cancel.button[0].onclick = () => this.cancel();
        this.buttons.accept.button[0].onclick = () => this.accept();
        this.buttons.delete.button[0].onclick = () => this.delete();
    }

    showAllFields() {
        $(`#fullitem${this.id} .input-container > div`).removeClass("hide");
    }

    hideEmptyFields() {
        if (this.series.data.date === "") {
            this.fields.date.div.addClass("hide");
            this.buttons.update.div.addClass("hide");
        }
        if (this.series.data.status === STATUS.JUST_WATCH) {
            this.buttons.update.div.addClass("hide");
        }
        if (this.series.data.note === "") {
            this.fields.note.div.addClass("hide");
        }
    }

    turnOnActiveItem() {
        super.turnOnActiveItem();
        $(`#item${this.series.data.id}`).addClass("active");
    }

    needToOpen(series) {
        let display = $(`#fullitem${this.id}`).css("display");
        return !(display !== "none" && this.series && this.series.data.id === series.data.id);
    }

    open(series) {
        if (this.needToOpen(series)) {
            this.series = series;
            this.moveByGridState();
            super.open();
            this.setSeries(series);
            this.turnOnActiveItem();
            this.showAllFields();
            this.showEditFields(false);
            this.onChangeStatus();
            this.hideEmptyFields();
        }
    }

    moveByGridState() {
        if (document.querySelector(`#horizontalContainer${this.id} .grid-icon`).classList.contains("on")) {
            if (this.series) {
                let fullitem = document.getElementById(`fullitem${this.id}`);
                let list = document.getElementById(`hlcList${this.id}`);
                let children = list.childNodes;
                let childrenArray = Array.from(children);
                let removeIdx = childrenArray.indexOf(fullitem);
                if (removeIdx > -1) {
                    childrenArray.splice(removeIdx, 1);
                }
                let idx = childrenArray.indexOf(document.getElementById(`item${this.series.data.id}`));
                idx = Math.floor(idx / this.hContainer.countNumber) * this.hContainer.countNumber
                    + (this.hContainer.countNumber - 1) + (((removeIdx > -1) && (removeIdx <= (idx + (this.hContainer.countNumber - idx % this.hContainer.countNumber)))) ? 1 : 0);
                if (idx >= children.length) {
                    idx = children.length - 1;
                }
                list.insertBefore(fullitem, children.item(idx).nextSibling);
            }
        } else {
            this.moveToDefault();
        }
    }

    moveToDefault() {
        document.getElementById(`horizontalContainer${this.id}`)
            .appendChild(document.getElementById(`fullitem${this.id}`));
    }

    close() {
        this.series = null;
        super.close();
        $(`#horizontalContainer${this.id} .outer-list`)[0].scrollIntoView({behavior: "smooth",
                                                                          block: "center", inline: "nearest"});
        this.clearActiveItems();
    }

    setSeries(series) {
        this.setDisplayValues(series);
        this.setInputValues(series);
    }

    change() {
        this.showAllFields();
        this.showEditFields(true);
    }

    update() {
        let date = new Date(this.series.data.date);
        date.setDate(date.getDate() + 7);
        let changed = this.series.update(this.series.data.season, parseInt(this.series.data.episode) + 1, date,
            this.series.data.site, this.series.data.image, this.series.data.status, this.series.data.note);
        this.database.putSeriesInDb(this.series);

        if (changed) {
            if (getSeriesListType(this.series) !== this.id) {
                this.close();
                return;
            }
        }

        this.setDisplayValues(this.series);
        this.setInputValues(this.series);
    }

    cancel() {
        this.fields.image.value.css("background-image", `url("${this.series.data.image}")`);
        this.setInputValues(this.series);
        this.showAllFields();
        this.showEditFields(false);
        this.onChangeStatus();
        this.hideEmptyFields();
    }

    accept() {
        let data = this.getValuesFromInputs();
        if (data === null) {
            return;
        }
        let image = data.backgroundImage.length > 5
                  ? data.backgroundImage.slice(4, -1).replace(/"/g, "")
                  : this.series.data.image;
        let changed = this.series.update(data.season, data.episode, data.date,
                                         data.site, image, data.status, data.note);
        this.database.putSeriesInDb(this.series);

        if (changed) {
            if (getSeriesListType(this.series) !== this.id) {
                this.close();
                return;
            }
        }

        this.setDisplayValues(this.series);
        this.showAllFields();
        this.showEditFields(false);
        this.hideEmptyFields();
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
        return `<div id="nameRow${this.id}" class="row on-edit">
            <div class="label">Название</div>
            <div class="input">
                <input id="name${this.id}" class="fullitem-input" name="name" type="text" minlength="1" maxlength="100" required/>
                <div class="invalid-tooltip">
                    <label class="error" for="name${this.id}"></label>
                </div>
            </div>
        </div>`;
    }

    getButtonContainerInnerHtml() {
        return `<div id="addButton${this.id}" class="add-button on-edit">
            <button>Добавить</button>
        </div>`;
    }

    setSeriesId(seriesId) {
        this.seriesId = seriesId;
    }

    getFields() {
        if (this.fields === null) {
            super.getFields();
            this.fields.name = {
                input: $(`#nameRow${this.id} input`)
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
        this.buttons.add.button[0].onclick = () => this.add();
    }

    resetInputValues() {
        this.fields.name.input.val("");
        super.resetInputValues();
    }

    open() {
        if ($(`#fullitem${this.id}`).css("display") === "none") {
            super.open();
            this.resetInputValues();
            this.showEditFields(true);
            this.turnOnActiveItem();
        }
    }

    checkInputs() {
        if (!this.fields.name.input.valid()) {
            return false;
        }
        return super.checkInputs();
    }

    add() {
        let data = this.getValuesFromInputs();
        if (!data) {
            return;
        }
        let name = this.fields.name.input.val();
        let image = data.backgroundImage.length > 5
                  ? data.backgroundImage.slice(4, -1).replace(/"/g, "")
                  : "";
        let series = new Series(this.seriesId++, name, data.season, data.episode, data.date,
                                data.site, image, data.status, data.note);
        this.database.putSeriesInDb(series);
        this.close();
        this.showSeries(series);
    }
}
