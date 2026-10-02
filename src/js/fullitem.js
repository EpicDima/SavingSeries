import {getStatusOptions, STATUS} from "./constants";
import {
    addClass,
    createLinkElement,
    dateInputStringToObject,
    dateObjectToInputString,
    dateToLocaleString,
    getByQuery,
    getSeriesListType,
    hideElement,
    imageToCssUrl,
    removeClass,
    showElement
} from "./common";
import Series from "./series";
import {resetValidation, setValidator, validate} from "./validator";
import AlertDialog from "./alertDialog";


export class BaseFullItem {

    static ENTER_KEY = "Enter";
    static ESCAPE_KEY = "Escape";

    constructor(id, needTop = true) {
        this.id = id;
        this.needTop = needTop;
        this.documentListeners = new AbortController();

        this.generate();
    }


    getFragment() {
        return this.fullitem;
    }


    generate() {
        const template = document.getElementById("fullitemTemplate");
        this.fragment = template.content.cloneNode(true);

        this.fullitem = this.fragment.querySelector(".fullitem");
        this.fullitem.id = `fullitem${this.id}`;

        if (!this.needTop) {
            const topElement = this.fragment.querySelector(".top");
            if (topElement) {
                topElement.remove();
            }
        } else {
            const nameTitle = this.fragment.querySelector(".name-title");
            if (nameTitle) {
                nameTitle.id = `nameTitle${this.id}`;
            }
        }

        this.form = this.fragment.querySelector("form");
        this.form.id = `form${this.id}`;

        const inputs = this.getInputsHtml();
        if (inputs) {
            this.form.insertAdjacentHTML("afterbegin", inputs);
        }

        const buttonContainer = this.fragment.querySelector(".button-container");
        buttonContainer.innerHTML = this.getButtonContainerInnerHtml();

        this.getFields();
        this.populateStatusOptions();
        this.getButtons();

        this.setListeners();
    }

    populateStatusOptions() {
        const options = getStatusOptions();
        options.forEach(opt => {
            const optionElement = document.createElement("option");
            optionElement.value = opt.value;
            optionElement.textContent = opt.text;
            this.fields.status.input.appendChild(optionElement);
        });
    }


    getInputsHtml() {
        return "";
    }


    getButtonContainerInnerHtml() {
        return "";
    }


    getFields() {
        this.fields = {
            season: this.getField("input[name='season']"),
            episode: this.getField("input[name='episode']"),
            date: this.getField("input[name='date']"),
            site: this.getField("input[name='site']"),
            image: {...this.getField("input[name='image']"), value: this.fragment.querySelector(".image")},
            status: this.getField("select[name='status']"),
            note: this.getField("textarea[name='note']")
        };
    }


    getField(selector) {
        const input = this.fragment.querySelector(selector);
        const row = input.closest(".row");
        return {div: row, value: row.querySelector(".value"), input, error: row.querySelector(".error")};
    }


    getButtons() {
        this.buttons = {
            close: {
                div: this.fragment.querySelector(".outer-close"),
                button: this.fragment.querySelector(".close")
            }
        };
    }

    repopulateStatusOptions() {
        const selectedStatus = this.fields.status.input.value;
        this.fields.status.input.innerHTML = "";
        this.populateStatusOptions();
        this.fields.status.input.value = selectedStatus;
    }


    setListeners() {
        this.form.onsubmit = (e) => e.preventDefault();

        this.buttons.close.button.onclick = () => this.close();

        this.fields.image.input.onchange = () => this.changeImage();
        this.fields.status.input.onchange = () => this.onChangeStatus();

        this.setValidators();

        document.addEventListener("languagechange", () => this.repopulateStatusOptions(),
            {signal: this.documentListeners.signal});
    }


    setValidators() {
        setValidator(this.fields.season.input);
        setValidator(this.fields.episode.input);
        setValidator(this.fields.date.input);
        setValidator(this.fields.site.input);
    }


    validateInputs() {
        validate(this.fields.season.input);
        validate(this.fields.episode.input);
        validate(this.fields.date.input);
        validate(this.fields.site.input);
    }


    open() {
        let opened = getByQuery(`.fullitem:not(.hide):not(#fullitem${this.id})`);
        hideElement(opened);
        this.resetInputValues();
        this.setKeyboardListener();
        showElement(this.fullitem);
        setTimeout(() => this.fullitem.scrollIntoView({behavior: "smooth", block: "end"}), 35);
    }


    setKeyboardListener() {
        this.keydownListener = (e) => {
            if (this.isOwnKey(e)) {
                this.keyboardListen(e);
            }
        };
        document.onkeydown = this.keydownListener;
    }


    // Клавиатура могла уже перейти к другой открытой карточке
    removeKeyboardListener() {
        if (document.onkeydown === this.keydownListener) {
            document.onkeydown = null;
        }
    }


    // Нажатия в диалоге поверх карточки — его, Enter на кнопке нажимает саму кнопку, а в заметке переносит строку
    isOwnKey(event) {
        return !event.repeat && !event.target.closest("dialog")
            && !(event.key === BaseFullItem.ENTER_KEY
                && (event.target instanceof HTMLButtonElement || event.target instanceof HTMLTextAreaElement));
    }


    keyboardListen(event) {
    }


    clearActiveItem() {
        removeClass(getByQuery(".item-outer.active"), "active");
    }


    hide() {
        hideElement(this.fullitem);
    }


    close() {
        this.removeKeyboardListener();
        this.hide();
    }


    remove() {
        this.documentListeners.abort();
        this.removeKeyboardListener();
        this.fullitem.remove();
    }


    changeImage() {
        this.setErrorToImageInput();
        let reader = new FileReader();
        reader.onload = () => this.fields.image.value.style.backgroundImage = `url(${reader.result})`;
        let file = this.fields.image.input.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                this.setErrorToImageInput(window.i18n.t("not_an_image"));
            } else if (file.size > 10 * 1024 * 1024) {
                this.setErrorToImageInput(window.i18n.t("file_too_large"));
            } else {
                reader.readAsDataURL(file);
            }
        }
    }


    setErrorToImageInput(text = "") {
        this.fields.image.error.innerText = text;
        this.fields.image.input.closest(".fullitem-input-label").classList.toggle("invalid", text !== "");
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
        this.fields.date.value.innerText = dateToLocaleString(series.data.date);
        this.fields.site.value.replaceChildren(createLinkElement(series.data.site));
        this.fields.image.value.style.backgroundImage = imageToCssUrl(series.data.image);
        this.fields.note.value.innerText = series.data.note;
    }


    setInputValues(series) {
        this.fields.season.input.value = series.data.season;
        this.fields.episode.input.value = series.data.episode;
        this.fields.date.input.value = dateObjectToInputString(series.data.date);
        this.fields.site.input.value = series.data.site;
        this.fields.image.input.value = "";
        this.fields.status.input.value = series.data.status;
        this.fields.note.input.value = series.data.note;
    }


    resetInputValues() {
        this.form.reset();
        this.fields.image.value.style.backgroundImage = "";
        resetValidation(this.form);
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
            && this.fields.status.input.validity.valid && this.fields.note.input.validity.valid;
    }


    getValuesFromInputs() {
        if (this.checkInputs()) {
            return {
                season: this.getNumberValue("season"),
                episode: this.getNumberValue("episode"),
                date: dateInputStringToObject(this.fields.date.input.value),
                site: this.fields.site.input.value,
                backgroundImage: this.fields.image.value.style.backgroundImage,
                status: this.fields.status.input.value,
                note: this.fields.note.input.value
            }
        }
        return null;
    }


    // Скрытое статусом поле не проверяется, и неверное значение из него не должно попасть в базу
    getNumberValue(name) {
        const input = this.fields[name].input;
        return input.validity.valid ? Number(input.value) : this.getPreviousNumber(name);
    }


    getPreviousNumber(name) {
        return Number(this.fields[name].input.defaultValue);
    }


    // Новую картинку сжимаем один раз и до сохранения
    async getChosenImage(data, currentImage) {
        const image = data.backgroundImage.length > 7 ? data.backgroundImage.slice(5, -2) : currentImage;
        return image && image !== currentImage ? Series.compressImage(image) : image;
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
        const template = document.getElementById("fullitemButtonsTemplate");
        return template.innerHTML;
    }


    getFields() {
        super.getFields();
        this.fields.name = {
            value: this.fragment.querySelector(".name-title")
        };
    }


    getButtons() {
        super.getButtons();
        this.buttons.change = {
            div: this.fragment.querySelector(".change-button"),
            button: this.fragment.querySelector(".change-button button")
        };
        this.buttons.update = {
            div: this.fragment.querySelector(".update-button"),
            button: this.fragment.querySelector(".update-button button")
        };
        this.buttons.cancel = {
            div: this.fragment.querySelector(".cancel-button"),
            button: this.fragment.querySelector(".cancel-button button")
        };
        this.buttons.accept = {
            div: this.fragment.querySelector(".accept-button"),
            button: this.fragment.querySelector(".accept-button button")
        };
        this.buttons.delete = {
            div: this.fragment.querySelector(".delete-button"),
            button: this.fragment.querySelector(".delete-button button")
        };
    }


    setListeners() {
        super.setListeners();
        this.buttons.change.button.onclick = () => this.change();
        this.buttons.update.button.onclick = () => this.update();
        this.buttons.cancel.button.onclick = () => this.cancel();
        this.buttons.accept.button.onclick = () => this.accept();
        this.buttons.delete.button.onclick = () => this.delete();

        document.addEventListener("languagechange", () => this.repopulateDisplayValues(),
            {signal: this.documentListeners.signal});
    }

    repopulateDisplayValues() {
        if (this.series) {
            this.setDisplayValues(this.series);
        }
    }

    keyboardListen(event) {
        if (event.key === BaseFullItem.ENTER_KEY) {
            if (this.changeMode) {
                event.preventDefault();
                this.accept();
            }
        } else if (event.key === BaseFullItem.ESCAPE_KEY) {
            if (this.changeMode) {
                this.cancel();
            } else {
                this.close();
            }
        }
    }


    showAllFields() {
        this.form.querySelectorAll(".row").forEach(elem => showElement(elem));
    }


    hideEmptyFields() {
        if (this.series.data.date === "") {
            hideElement(this.fields.date.div);
        }
        if (this.series.data.site === "") {
            hideElement(this.fields.site.div);
        }
        if (this.series.data.note === "") {
            hideElement(this.fields.note.div);
        }
        if (this.series.data.date === "" && this.series.data.status !== STATUS.JUST_WATCH) {
            hideElement(this.buttons.update.div);
        }
    }


    applyUpdateButton() {
        if (this.series.data.date === "") {
            this.buttons.update.button.title = window.i18n.t("next_episode");
        } else {
            this.buttons.update.button.title = window.i18n.t("next_episode_in_a_week");
        }
    }


    getPreviousNumber(name) {
        return this.series.data[name];
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
            this.changeMode = false;
            this.moveByGridState();
            super.open();
            window.i18n.applyTo(this.fullitem);
            this.setSeries(series);
            this.turnOnActiveItem();
            this.showAllFields();
            this.showEditFields(false);
            this.onChangeStatus();
            this.hideEmptyFields();
            this.applyUpdateButton();
        } else {
            this.close();
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
        this.changeMode = false;
        this.series = null;
        super.close();
        this.clearActiveItem();
    }


    setSeries(series) {
        this.setDisplayValues(series);
        this.setInputValues(series);
    }


    change() {
        this.changeMode = true;
        this.showAllFields();
        this.showEditFields(true);
        this.onChangeStatus();
    }


    update() {
        let date = this.series.data.date;
        if (date !== "") {
            date = new Date(this.series.data.date);
            date.setUTCDate(date.getUTCDate() + 7);
        }
        let changed = this.series.update(this.series.data.season, this.series.data.episode + 1, date,
            this.series.data.site, this.series.data.image, this.series.data.status, this.series.data.note);
        this.database.putSeriesInDb(this.series);

        if (changed) {
            if (getSeriesListType(this.series) !== this.id) {
                this.close();
                return;
            }
        }

        this.changeMode = false;
        this.setDisplayValues(this.series);
        this.setInputValues(this.series);
    }


    cancel() {
        this.changeMode = false;
        this.fields.image.value.style.backgroundImage = imageToCssUrl(this.series.data.image);
        this.setInputValues(this.series);
        this.showAllFields();
        this.showEditFields(false);
        this.onChangeStatus();
        this.hideEmptyFields();
    }


    async accept() {
        let data = this.getValuesFromInputs();
        if (!data) {
            return;
        }
        const series = this.series;
        const image = await this.getChosenImage(data, series.data.image);
        const imageChanged = image !== series.data.image;
        let changed = series.update(data.season, data.episode, data.date,
            data.site, image, data.status, data.note);
        this.database.putSeriesInDb(series, imageChanged);
        if (this.series !== series) {
            return;
        }

        if (changed) {
            if (getSeriesListType(this.series) !== this.id) {
                this.close();
                return;
            }
        }

        this.changeMode = false;
        this.setDisplayValues(this.series);
        this.showAllFields();
        this.showEditFields(false);
        this.onChangeStatus();
        this.hideEmptyFields();
        this.applyUpdateButton();
    }


    async delete() {
        let dialog = new AlertDialog(window.i18n.t("confirm_delete", {name: this.series.data.name}));
        let result = await dialog.open();
        if (result && await this.database.deleteSeriesFromDb(this.series)) {
            this.series.delete();
            this.close();
        }
    }
}


export class AddingFullItem extends BaseFullItem {

    constructor(showSeries, database) {
        super("add", false);
        this.showSeries = showSeries;
        this.database = database;
    }


    getInputsHtml() {
        const template = document.getElementById("fullitemInputsTemplate");
        return template.innerHTML;
    }


    getButtonContainerInnerHtml() {
        const template = document.getElementById("addingFullitemButtonsTemplate");
        return template.innerHTML;
    }


    getFields() {
        super.getFields();
        this.fields.name = this.getField("input[name='name']");
    }


    getButtons() {
        super.getButtons();
        this.buttons.add = {
            div: this.fragment.querySelector(".add-button"),
            button: this.fragment.querySelector(".add-button button")
        };
    }


    setListeners() {
        super.setListeners();
        this.buttons.add.button.onclick = () => this.add();
    }


    setValidators() {
        setValidator(this.fields.name.input);
        super.setValidators();
    }


    validateInputs() {
        super.validateInputs();
        validate(this.fields.name.input);
    }


    keyboardListen(event) {
        if (event.key === BaseFullItem.ENTER_KEY) {
            event.preventDefault();
            this.add();
        } else if (event.key === BaseFullItem.ESCAPE_KEY) {
            this.close();
        }
    }


    resetInputValues() {
        this.fields.name.input.value = "";
        super.resetInputValues();
    }


    open() {
        if (this.fullitem.classList.contains("hide")) {
            super.open();
            window.i18n.applyTo(this.fullitem);
            this.showEditFields(true);
            this.onChangeStatus();
            this.clearActiveItem();
        }
    }


    toggle() {
        if (this.fullitem.classList.contains("hide")) {
            this.open();
        } else {
            this.close();
        }
    }


    checkInputs() {
        if (this.fields.name.input.validity.valid) {
            return super.checkInputs();
        }
        return false;
    }


    async add() {
        // Повторный Enter во время сжатия и записи добавил бы сериал дважды
        if (this.adding) {
            return;
        }
        let data = this.getValuesFromInputs();
        if (!data) {
            this.validateInputs();
            return;
        }
        let name = this.fields.name.input.value;
        this.adding = true;
        try {
            const image = await this.getChosenImage(data, "");
            let series = new Series(null, name, data.season, data.episode, data.date,
                data.site, image, data.status, data.note);
            const id = await this.database.addSeries(series);
            if (id === null) {
                return;
            }
            series.data.id = id;
            this.close();
            this.showSeries(series);
        } finally {
            this.adding = false;
        }
    }
}
