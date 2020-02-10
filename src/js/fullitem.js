import {getStatusOptionsHtml, STATUS, STATUS_STRING} from "./constants";
import {dateToLocaleString, createLinkElement} from "./common";

export default class FullItem {
    constructor(id) {
        this.id = id;
    }

    createHtml() {
        return `<div id="fullitem${this.id}" class="fullitem">
            <button type="button" class="close" aria-label="Close" data-toggle="collapse" data-target="#outerFullitem${this.id}">
                <span aria-hidden="true">&#10006;</span>
            </button>
            <div id="backgroundImage${this.id}" class="image"></div>
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
                        <div class="col-8 value"></div>
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
                        <div class="col-5 input"><textarea name="note"></textarea></div>
                    </div>
                </form>
            </div>
            <div class="button-container row">
                <div id="changeButton${this.id}" class="col-3 change-button"><button>Редактировать</button></div>
                <div id="cancelButton${this.id}" class="col-3 cancel-button"><button>Отмена</button></div>
                <div id="acceptButton${this.id}" class="col-3 accept-button"><button>Подтвердить</button></div>
                <div id="deleteButton${this.id}" class="col-3 delete-button"><button>Удалить</button></div>
            </div>
        </div>`;
    }

    open(series) {
        $(`.collapse`).collapse("hide");
        this.setSeries(series);
        $(`#changeButton${this.id}`).click(this.change);
        $(`#cancelButton${this.id}`).click(this.cancel);
        $(`#acceptButton${this.id}`).click(this.accept);
        $(`#deleteButton${this.id}`).click(this.delete);
        $(`#outerFullitem${this.id}`).collapse("show");
    }

    close() {
        $(`#outerFullitem${this.id}`).collapse("hide");
        resetFields();
        this.series = null;
    }

    setSeries(series) {
        this.series = series;
        this.setDisplayValues(series);
        this.setInputValues(series);
    }

    // TODO: получить все поля первый раз при использовании, чтобы не искать постоянно,
    //       и хранить в одном объекте для удобства доступа

    setDisplayValues(series) {
        $(`#name${this.id}`).html(series.name);
        $(`#backgroundImage${this.id}`).css("background-image", `url("${series.image}")`);
        $(`#season${this.id} .value`).html(series.season);
        $(`#episode${this.id} .value`).html(series.episode);
        $(`#date${this.id} .value`).html(dateToLocaleString(series.date));
        $(`#site${this.id} .value`).html(createLinkElement(series.site));
        $(`#image${this.id} .value`).css("background-image", `url("${series.image}")`);
        $(`#status${this.id} .value`).html(STATUS_STRING.get(series.status));
        $(`#note${this.id} .value`).html(series.note);
    }

    setInputValues(series) {
        $(`#season${this.id} input`).val(series.season);
        $(`#episode${this.id} input`).val(series.episode);
        $(`#date${this.id} input`).val(dateToLocaleString(series.date));
        $(`#site${this.id} input`).val(series.site);
        $(`#image${this.id} input`).val("");
        $(`#status${this.id} input`).val(series.status);
        $(`#note${this.id} input`).html(series.note);
    }

    resetFields() {
        $(`#name${this.id}`).html("");
        $(`#backgroundImage${this.id}`).css("background-image", "");
        $(`#season${this.id} .value`).html("");
        $(`#episode${this.id} .value`).html("");
        $(`#date${this.id} .value`).html("");
        $(`#site${this.id} .value`).html("");
        $(`#image${this.id} .value`).css("background-image", "");
        $(`#status${this.id} .value`).html("");
        $(`#note${this.id} .value`).html("");

        $(`#season${this.id} input`).val("");
        $(`#episode${this.id} input`).val("");
        $(`#date${this.id} input`).val("");
        $(`#site${this.id} input`).val("");
        $(`#image${this.id} input`).val("");
        $(`#status${this.id} input`).val(STATUS.RUN);
        $(`#note${this.id} input`).html("");
    }

    change() {
        $(`#fullitem${this.id} .value`).hide();
        $(`#fullitem${this.id} input`).show();
    }

    cancel() {
        $(`#fullitem${this.id} input`).hide();
        $(`#fullitem${this.id} .value`).show();
        this.setInputValues(this.series);
    }

    accept() {
        this.series.season = $(`#season${this.id} input`).val();
        this.series.episode = $(`#episode${this.id} input`).val();
        let date = $(`#date${this.id} input`).val();
        this.series.date = date === "" ? "" : new Date(date);
        this.series.site = $(`#site${this.id} input`).val();
        this.series.image = $(`#image${this.id} input`).val(); // картинка
        this.series.status = $(`#status${this.id} input`).val();
        this.series.note = $(`#note${this.id} input`).html();
        // обновить карточку
        close();
    }

    delete() {
        // удалить из списка и из базы
        close();
    }
}