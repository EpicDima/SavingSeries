import {getStatusOptionsHtml, STATUS} from "./constants";
import {
    dateToLocaleString,
    dateInputStringToObject,
    dateObjectToInputString,
    createLinkElement,
    getSeriesListType,
    parseHtml, removeClass, addClass, getByQuery, showElement, hideElement
} from "./common";
import Series from "./series";
import {setValidator} from "./validator";


export class BaseFullItem {

    constructor(id, needTop = true) {
        this.id = id;
        this.needTop = needTop;

        this.generate();
    }


    getFragment() {
        return this.fullitem;
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.fullitem = this.fragment.getElementById(`fullitem${this.id}`);
        this.form = this.fragment.querySelector("form");
        this.getFields();
        this.getButtons();

        this.setListeners();
    }


    createHtml() {
        return `<div id="fullitem${this.id}" class="fullitem hide">
            <div id="closeButton${this.id}" class="outer-close">
                <span class="close" title="Закрыть">&#10006;</span>
            </div>
            <div class="background">
                <div id="imageValue${this.id}" class="image"></div>
                <div class="gradient"></div>
            </div>
            <div class="content">
                ${this.needTop ? `<div class="top"><div id="nameTitle${this.id}" class="name-title"></div></div>` : ""}
                <div class="general">
                    <form class="input-container" novalidate>
                        ${this.getInputsHtml()}
                        <div id="statusRow${this.id}" class="row on-edit">
                            <div class="label">Статус</div>
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
                                <input id="site${this.id}" class="fullitem-input" name="site" type="url" maxlength="512"/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="site${this.id}"></label>
                                </div>
                            </div>
                        </div>
                        <div id="imageRow${this.id}" class="row on-edit">
                            <div class="label">Изображение</div>
                            <div class="input">
                                <input id="imageInput${this.id}" class="fullitem-input" name="image" type="file" accept="image/*"/>
                                <div class="invalid-tooltip">
                                    <label class="error" for="imageInput${this.id}"></label>
                                </div>
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


    getInputsHtml() {
        return "";
    }


    getButtonContainerInnerHtml() {
        return "";
    }


    getFields() {
        this.fields = {
            season: {
                div: this.fragment.getElementById(`seasonRow${this.id}`),
                value: this.fragment.querySelector(`#seasonRow${this.id} .value`),
                input: this.fragment.querySelector(`#seasonRow${this.id} input`),
                error: this.fragment.querySelector(`#seasonRow${this.id} .error`)
            },
            episode: {
                div: this.fragment.getElementById(`episodeRow${this.id}`),
                value: this.fragment.querySelector(`#episodeRow${this.id} .value`),
                input: this.fragment.querySelector(`#episodeRow${this.id} input`),
                error: this.fragment.querySelector(`#episodeRow${this.id} .error`)
            },
            date: {
                div: this.fragment.getElementById(`dateRow${this.id}`),
                value: this.fragment.querySelector(`#dateRow${this.id} .value`),
                input: this.fragment.querySelector(`#dateRow${this.id} input`),
                error: this.fragment.querySelector(`#dateRow${this.id} .error`)
            },
            site: {
                div: this.fragment.getElementById(`siteRow${this.id}`),
                value: this.fragment.querySelector(`#siteRow${this.id} .value`),
                input: this.fragment.querySelector(`#siteRow${this.id} input`),
                error: this.fragment.querySelector(`#siteRow${this.id} .error`)
            },
            image: {
                div: this.fragment.getElementById(`imageRow${this.id}`),
                value: this.fragment.getElementById(`imageValue${this.id}`),
                input: this.fragment.querySelector(`#imageRow${this.id} input`),
                error: this.fragment.querySelector(`#imageRow${this.id} .error`)
            },
            status: {
                div: this.fragment.getElementById(`statusRow${this.id}`),
                input: this.fragment.querySelector(`#statusRow${this.id} select`)
            },
            note: {
                div: this.fragment.getElementById(`noteRow${this.id}`),
                value: this.fragment.querySelector(`#noteRow${this.id} .value`),
                input: this.fragment.querySelector(`#noteRow${this.id} textarea`)
            }
        };
    }


    getButtons() {
        this.buttons = {
            close: {
                div: this.fragment.getElementById(`closeButton${this.id}`),
                button: this.fragment.querySelector(`#closeButton${this.id} span`)
            }
        };
    }


    setListeners() {
        this.form.onsubmit = (e) => e.preventDefault();

        this.buttons.close.button.onclick = () => this.close();

        this.fields.image.input.onchange = () => this.changeImage();
        this.fields.status.input.onchange = () => this.onChangeStatus();

        setValidator(this.fields.season.input, this.fields.season.error);
        setValidator(this.fields.episode.input, this.fields.episode.error);
        setValidator(this.fields.date.input, this.fields.date.error);
        setValidator(this.fields.site.input, this.fields.site.error);
    }


    open() {
        let opened = getByQuery(`.fullitem:not(.hide):not(#fullitem${this.id})`);
        hideElement(opened);
        this.resetInputValues();
        showElement(this.fullitem);
        setTimeout(() => this.fullitem.scrollIntoView({behavior: "smooth", block: "end"}), 35);
    }


    clearActiveItem() {
        removeClass(getByQuery(".item-outer.active"), "active");
    }


    hide() {
        hideElement(this.fullitem);
    }


    close() {
        this.hide();
    }


    remove() {
        this.fullitem.remove();
    }


    changeImage() {
        this.setErrorToImageInput();
        let reader = new FileReader();
        reader.onload = () => this.fields.image.value.style.backgroundImage = `url(${reader.result})`;
        let file = this.fields.image.input.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                this.setErrorToImageInput("Выбранный файл не является изображением.");
            } else if (file.size > 4 * 1024 * 1024) {
                this.setErrorToImageInput("Размер файла не должен превышать 4 мегабайта.");
            } else {
                reader.readAsDataURL(file);
            }
        }
    }


    setErrorToImageInput(text) {
        if (text) {
            this.fields.image.error.innerText = text;
            addClass(this.fields.image.input, "error");
        } else {
            removeClass(this.fields.image.input, "error");
        }
    }


    getStatusState() {
        let status = this.fields.status.input.value;
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
            showElement(this.fields.season.div);
        } else {
            hideElement(this.fields.season.div);
        }
        if (visibilityState.episode) {
            showElement(this.fields.episode.div);
        } else {
            hideElement(this.fields.episode.div);
        }
        if (visibilityState.date) {
            showElement(this.fields.date.div);
        } else {
            hideElement(this.fields.date.div);
        }
    }


    showEditFields(show) {
        let onEditElements = this.fullitem.querySelectorAll(".on-edit");
        let notOnEditElements = this.fullitem.querySelectorAll(".not-on-edit");
        if (show) {
            onEditElements.forEach(elem => showElement(elem));
            notOnEditElements.forEach(elem => hideElement(elem));
        } else {
            onEditElements.forEach(elem => hideElement(elem));
            notOnEditElements.forEach(elem => showElement(elem));
        }
    }


    setDisplayValues(series) {
        this.fields.name.value.innerText = series.data.name;
        this.fields.season.value.innerText = series.data.season;
        this.fields.episode.value.innerText = series.data.episode;
        this.fields.date.value.innerText = dateToLocaleString(series);
        this.fields.site.value.innerHTML = createLinkElement(series.data.site).outerHTML;
        this.fields.image.value.style.backgroundImage = `url("${series.data.image}")`;
        this.fields.note.value.innerText = series.data.note;
    }


    setInputValues(series) {
        this.fields.season.input.value = series.data.season;
        this.fields.episode.input.value = series.data.episode;
        this.fields.date.input.value = dateObjectToInputString(series);
        this.fields.site.input.value = series.data.site;
        this.fields.image.input.value = "";
        this.fields.status.input.value = series.data.status;
        this.fields.note.input.value = series.data.note;
    }


    resetInputValues() {
        this.form.reset();
        this.fields.image.value.style.backgroundImage = "";

        removeClass(this.fields.season.input, "error");
        removeClass(this.fields.episode.input, "error");
        removeClass(this.fields.date.input, "error");
        removeClass(this.fields.site.input, "error");
    }


    checkInputs() {
        let statusState = this.getStatusState();
        if (statusState.season && !this.fields.season.input.validity.valid) {
            return false;
        }
        if (statusState.episode && !this.fields.episode.input.validity.valid) {
            return false;
        }
        if (statusState.date && !this.fields.date.input.validity.valid) {
            return false;
        }
        return this.fields.site.input.validity.valid && this.fields.image.input.validity.valid
            && this.fields.image.input.validity.valid && this.fields.status.input.validity.valid
            && this.fields.note.input.validity.valid;
    }


    getValuesFromInputs() {
        if (this.checkInputs()) {
            return {
                season: this.fields.season.input.value,
                episode: this.fields.episode.input.value,
                date: dateInputStringToObject(this.fields.date.input.value),
                site: this.fields.site.input.value,
                backgroundImage: this.fields.image.value.style.backgroundImage,
                status: this.fields.status.input.value,
                note: this.fields.note.input.value
            }
        }
        return null;
    }
}


export class FullItem extends BaseFullItem {
    constructor(container, database) {
        super(container.id);
        this.container = container;
        this.database = database;

        this.default = true;
    }


    getButtonContainerInnerHtml() {
        return `<div id="changeButton${this.id}" class="change-button not-on-edit">
            <button>Редактировать</button>
        </div>
        <div id="updateButton${this.id}" class="update-button not-on-edit">
            <button title="Увеличивает серию на 1, дату на неделю">Следующая</button>
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
        super.getFields();
        this.fields.name = {
            value: this.fragment.getElementById(`nameTitle${this.id}`)
        };
    }


    getButtons() {
        super.getButtons();
        this.buttons.change = {
            div: this.fragment.getElementById(`changeButton${this.id}`),
            button: this.fragment.querySelector(`#changeButton${this.id} button`)
        };
        this.buttons.update = {
            div: this.fragment.getElementById(`updateButton${this.id}`),
            button: this.fragment.querySelector(`#updateButton${this.id} button`)
        };
        this.buttons.cancel = {
            div: this.fragment.getElementById(`cancelButton${this.id}`),
            button: this.fragment.querySelector(`#cancelButton${this.id} button`)
        };
        this.buttons.accept = {
            div: this.fragment.getElementById(`acceptButton${this.id}`),
            button: this.fragment.querySelector(`#acceptButton${this.id} button`)
        };
        this.buttons.delete = {
            div: this.fragment.getElementById(`deleteButton${this.id}`),
            button: this.fragment.querySelector(`#deleteButton${this.id} button`)
        };
    }


    setListeners() {
        super.setListeners();
        this.buttons.change.button.onclick = () => this.change();
        this.buttons.update.button.onclick = () => this.update();
        this.buttons.cancel.button.onclick = () => this.cancel();
        this.buttons.accept.button.onclick = () => this.accept();
        this.buttons.delete.button.onclick = () => this.delete();
    }


    showAllFields() {
        this.form.querySelectorAll("div").forEach(elem => showElement(elem));
    }


    hideEmptyFields() {
        if (this.series.data.date === "") {
            hideElement(this.fields.date.div);
            hideElement(this.buttons.update.div);
        }
        if (this.series.data.site === "") {
            hideElement(this.fields.site.div);
        }
        if (this.series.data.status === STATUS.JUST_WATCH) {
            hideElement(this.buttons.update.div);
        }
        if (this.series.data.note === "") {
            hideElement(this.fields.note.div);
        }
    }


    turnOnActiveItem() {
        this.clearActiveItem();
        addClass(this.series.getFragment(), "active");
    }


    needToOpen(series) {
        return !(!this.fullitem.classList.contains("hide")
            && this.series && this.series.data.id === series.data.id);
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
        if (this.container.grid) {
            if (this.series) {
                this.default = false;
                let children = this.container.hlcList.childNodes;
                let childrenArray = Array.from(children);
                let removeIdx = childrenArray.indexOf(this.fullitem);
                if (removeIdx > -1) {
                    childrenArray.splice(removeIdx, 1);
                }
                let idx = childrenArray.indexOf(this.series.getFragment());
                idx = Math.floor(idx / this.container.countNumber) * this.container.countNumber
                    + (this.container.countNumber - 1) + (((removeIdx > -1) && (removeIdx <= (idx +
                        (this.container.countNumber - idx % this.container.countNumber)))) ? 1 : 0);
                if (idx >= children.length) {
                    idx = children.length - 1;
                }
                children.item(idx).insertAdjacentElement("afterend", this.fullitem);
            }
        } else {
            this.moveToDefault();
        }
    }


    moveToDefault() {
        if (!this.default) {
            this.container.container.append(this.fullitem);
            this.default = true;
        }
    }


    close() {
        this.series = null;
        super.close();
        this.container.getFragment().scrollIntoView({behavior: "smooth", block: "center"});
        this.clearActiveItem();
    }


    setSeries(series) {
        this.setDisplayValues(series);
        this.setInputValues(series);
    }


    change() {
        this.showAllFields();
        this.showEditFields(true);
        this.onChangeStatus();
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
        this.fields.image.value.style.backgroundImage = `url("${this.series.data.image}")`;
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
        let image = data.backgroundImage.length > 7 ? data.backgroundImage.slice(5, -2) : this.series.data.image;
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
        this.onChangeStatus();
        this.hideEmptyFields();
    }


    delete() {
        if (confirm(`Вы действительно хотите удалить "${this.series.data.name}"?`)) {
            this.series.delete();
            this.database.deleteSeriesFromDb(this.series);
            this.close();
        }
    }
}


export class AddingFullItem extends BaseFullItem {

    static seriesId = 0;

    constructor(showSeries, database) {
        super("add", false);
        this.showSeries = showSeries;
        this.database = database;
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
        AddingFullItem.seriesId = seriesId;
    }


    getFields() {
        super.getFields();
        this.fields.name = {
            input: this.fragment.querySelector(`#nameRow${this.id} input`),
            error: this.fragment.querySelector(`#nameRow${this.id} .error`)
        };
    }


    getButtons() {
        super.getButtons();
        this.buttons.add = {
            div: this.fragment.getElementById(`addButton${this.id}`),
            button: this.fragment.querySelector(`#addButton${this.id} button`)
        };
    }


    setListeners() {
        super.setListeners();
        this.buttons.add.button.onclick = () => this.add();
        setValidator(this.fields.name.input, this.fields.name.error);
    }


    resetInputValues() {
        this.fields.name.input.value = "";
        removeClass(this.fields.name.input, "error");
        super.resetInputValues();
    }


    open() {
        if (this.fullitem.classList.contains("hide")) {
            super.open();
            this.resetInputValues();
            this.showEditFields(true);
            this.onChangeStatus();
            this.clearActiveItem();
        }
    }


    checkInputs() {
        if (this.fields.name.input.validity.valid) {
            return super.checkInputs();
        }
        return false;
    }


    add() {
        let data = this.getValuesFromInputs();
        if (!data) {
            return;
        }
        let name = this.fields.name.input.value;
        let image = data.backgroundImage.length > 7 ? data.backgroundImage.slice(5, -2) : "";
        let series = new Series(AddingFullItem.seriesId++, name, data.season, data.episode, data.date,
                data.site, image, data.status, data.note);
        this.database.putSeriesInDb(series);
        this.close();
        this.showSeries(series);
    }
}
