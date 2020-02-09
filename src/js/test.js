import "bootstrap/dist/css/bootstrap.min.css";
import "../css/test.css";

import "jquery";
import "popper.js";
import "bootstrap";


let indexedDB = window.indexedDB;

function findImageAndSave(element) {
    let reader = new FileReader();
    reader.onloadend = function(event) {
        saveImage(event.target.result)
    }
    reader.readAsDataURL(element.files[0]); // конвертирует Blob в base64 и вызывает onload
}

// Create/open database
var request = indexedDB.open("SavingSeries", 1),
    db,
    createObjectStore = function (dataBase) {
        // Create an objectStore
        console.log("Creating objectStore")
        dataBase.createObjectStore("images");
    };

function continuation(blob) {
    // Open a transaction to the database
    var transaction = db.transaction(["images"], "readwrite");
    var put = transaction.objectStore("images").put(blob, "image");

    // Retrieve the file that was just stored
    transaction.objectStore("images").get("image").onsuccess = function (event) {
        console.log("Got elephant! " );
        // Create and revoke ObjectURL


        // Set img src to ObjectURL
        var imgElephant = document.getElementById("img1");
        imgElephant.setAttribute("src", event.target.result);

    };
}

request.onerror = function (event) {
    console.log("Error creating/accessing IndexedDB database");
}

request.onsuccess = function (event) {
    console.log("Success creating/accessing IndexedDB database");
    db = request.result;

    db.onerror = function (event) {
        console.log("Error creating/accessing IndexedDB database");
    };
    
    // Interim solution for Google Chrome to create an objectStore. Will be deprecated
    if (db.setVersion) {
        if (db.version != dbVersion) {
            var setVersion = db.setVersion(dbVersion);
            setVersion.onsuccess = function () {
                createObjectStore(db);
            };
        }
    }
}

// For future use. Currently only in latest Firefox versions
request.onupgradeneeded = function (event) {
    createObjectStore(event.target.result);
};




$("#rightButton").click(function() {
    event.preventDefault();
    $(".list").animate({
        scrollLeft: "+=800"
    }, 350);
});
  
$("#leftButton").click(function() {
    event.preventDefault();
    $(".list").animate({
        scrollLeft: "-=800"
    }, 350);
});



class Series {
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
                <div class="image" style="background-image: url("${this.image}");"></div>
                <div class="gradient"></div>
                <div class="name">${this.name}</div>
            </div>
        </div>`;
    }

    deleteHtml() {
        $(`item${this.id}`).delete();
    }

}


class FullItem {
    constructor(id) {
        this.id = id;
    }

    createHtml() {
        return `<div id="fullitem${this.id}" class="fullitem collapse">
            <button type="button" class="close" aria-label="Close" data-toggle="collapse" data-target="#fullitem${this.id}">
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
        $(`#fullitem${this.id}`).collapse("show");
    }

    close() {
        $(`#fullitem${this.id}`).collapse("hide");
        resetFields();
        this.series = null;
    }

    setSeries(series) {
        this.series = series;
        this.setDisplayValues(series);
        this.setInputValues(series);
    }

    setDisplayValues(series) {
        $(`#name${this.id}`).html(series.name);
        $(`#backgroundImage${this.id}`).css("background-image", `url("${series.image}")`);
        $(`#season${this.id} .value`).html(series.season);
        $(`#episode${this.id} .value`).value = series.episode;
        $(`#date${this.id} .value`).value = dateToLocaleString(series.date);
        $(`#site${this.id} .value`).value = createLinkElement(series.site);
        $(`#image${this.id} .value`).css("background-image", `url("${series.image}")`);
        $(`#status${this.id} .value`).value = STATUS_STRING[series.status];
        $(`#note${this.id} .value`).value = series.note;
    }

    setInputValues(series) {
        $(`#season${this.id} input`).value = series.season;
        $(`#episode${this.id} input`).value = series.episode;
        $(`#date${this.id} input`).value = dateToLocaleString(series.date);
        $(`#site${this.id} input`).value = series.site;
        $(`#image${this.id} input`).value = "";
        $(`#status${this.id} input`).selectedIndex = series.status;
        $(`#note${this.id} input`).innerHTML = series.note;
    }

    resetFields() {
        $(`#name${this.id}`).value = "";
        $(`#backgroundImage${this.id}`).css("background-image", "");
        $(`#season${this.id} .value`).value = "";
        $(`#episode${this.id} .value`).value = "";
        $(`#date${this.id} .value`).value = "";
        $(`#site${this.id} .value`).value = "";
        $(`#image${this.id} .value`).css("background-image", "");
        $(`#status${this.id} .value`).value = "";
        $(`#note${this.id} .value`).value = "";

        $(`#season${this.id} input`).value = "";
        $(`#episode${this.id} input`).value = "";
        $(`#date${this.id} input`).value = "";
        $(`#site${this.id} input`).value = "";
        $(`#image${this.id} input`).value = "";
        $(`#status${this.id} input`).selectedIndex = "";
        $(`#note${this.id} input`).innerHTML = "";
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
        this.series.season = $(`#season${this.id} input`).value;
        this.series.episode = $(`#episode${this.id} input`).value;
        let date = $(`#date${this.id} input`).value;
        this.series.date = date === "" ? "" : new Date(date);
        this.series.site = $(`#site${this.id} input`).value;
        this.series.image = $(`#image${this.id} input`).value; // картинка
        this.series.status = $(`#status${this.id} input`).selectedIndex;
        this.series.note = $(`#note${this.id} input`).html();
        // обновить карточку
        close();
    }

    delete() {
        // удалить из списка и из базы
        close();
    }
}


class HorizontalContainer {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.map = new Map();
    }

    createHtml() {
        this.fullitem = new FullItem(this.id);
        return `<div id="horizontalContainer${this.id}" class="hlist-container">
            <div class="title">${this.title}</div>
            <div class="outer-list">
                <div id="hlcList${this.id}" class="list"></div>
                <div class="left-icon-control" id="leftButton${this.id}"></div>
                <div class="right-icon-control" id="rightButton${this.id}"></div>
            </div>
            ${this.fullitem.createHtml()}
        </div>`;
    }

    show() {
        $(`#horizontalContainer${this.id}`).show();
    }

    hide() {
        $(`#horizontalContainer${this.id}`).hide();
    }

    addSeries(series) {
        this.map.set(series.id, series);
        $(`#hlcList${this.id}`).append(series.createHtml());
    }

    showFullItemIfExists(id) {
        let t = this.map.get(id);
        if (t === undefined) {
            return false;
        }
        this.fullitem.open(t);
        return true;
    }
}


// RUN - выходит и смотрится
// PAUSE - выходит, но на паузе, то есть временно не смотрится
// COMPLETED - просмотрен
// JUST_WATCH - вышел ранее, только смотрится
const STATUS = {RUN: 0, PAUSE: 1, COMPLETED: 2, JUST_WATCH: 3};
const STATUS_STRING = new Map();
STATUS_STRING.set(STATUS.RUN, "Выходит");
STATUS_STRING.set(STATUS.PAUSE, "На паузе");
STATUS_STRING.set(STATUS.COMPLETED, "Просмотрен");
STATUS_STRING.set(STATUS.JUST_WATCH, "Просматривается, но уже вышел");

function getStatusOptionsHtml() {
    let s = "";
    for (const i in STATUS) {
        s += `<option value="${STATUS[i]}">${STATUS_STRING.get(STATUS[i])}</option>`;
    }
    return s;
}


// первый список - вышедшие сегодня и ранее
// второй список - просматривающиеся, но вышедшие давно
// третий список - выходящие в ближайшие 7 дней
// четвёртый список - с датой остальные
// пятый список - без даты
// шестой список - на паузе
// седьмой список - просмотренные
const LIST_TYPE = {
    RELEASED: 0,
    RELEASED_LONG_AGO: 1,
    RELEASED_NEXT_7_DAYS: 2,
    WITH_DATE_OTHERS: 3,
    WITHOUT_DATE: 4,
    ON_PAUSE: 5,
    COMPLETED: 6
};

const LIST_NAMES = new Map();
LIST_NAMES.set(LIST_TYPE.RELEASED, "Вышедшие");
LIST_NAMES.set(LIST_TYPE.RELEASED_LONG_AGO, "Просматривающиеся");
LIST_NAMES.set(LIST_TYPE.RELEASED_NEXT_7_DAYS, "Выходящие в ближайшие 7 дней");
LIST_NAMES.set(LIST_TYPE.WITH_DATE_OTHERS, "Остальные");
LIST_NAMES.set(LIST_TYPE.WITHOUT_DATE, "Без даты");
LIST_NAMES.set(LIST_TYPE.ON_PAUSE, "На паузе");
LIST_NAMES.set(LIST_TYPE.COMPLETED, "Завершённые");


const containers = new Map();

let currentSeries = null;

init();


function init() {
    let inner = "";
    for (let i in LIST_TYPE) {
        let k = LIST_TYPE[i];
        let container = new HorizontalContainer(k, LIST_NAMES.get(k));
        containers.set(k, container);
        inner += container.createHtml();
    }
    document.getElementsByTagName("main")[0].innerHTML = inner;
}



let seriesListDatabase = [
    new Series(1, "Игра престолов", 8, 7, "", "https://kinogo.by", "Слили финал конечно", STATUS.WATCH, ""),
    new Series(2, "Очень странные дела", 4, 1, "", "https://kinogo.by", "", STATUS.RUN, "")
];

splitSeriesList(seriesListDatabase);

function splitSeriesList(list) {
    for (const series of list) {
        insertSeries(series);
    }
}


function getTodayDate() {
    let today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}


function insertSeries(series) {
    let listtype;
    if (series.status === STATUS.COMPLETED) {
        listtype = LIST_TYPE.COMPLETED;
    } else if (series.status === STATUS.PAUSE) {
        listtype = LIST_TYPE.ON_PAUSE;
    } else if (series.status === STATUS.WATCH) {
        listtype = LIST_TYPE.RELEASED_LONG_AGO;
    } else if (series.date === "") {
        listtype = LIST_TYPE.WITHOUT_DATE;
    } else {
        let today = getTodayDate();
        if (series.date < today) {
            listtype = LIST_TYPE.RELEASED;
        } else {
            today.setDate(today.getDate() + 7);
            if (series.date < today) {
                listtype = LIST_TYPE.RELEASED_NEXT_7_DAYS;
            } else {
                listtype = LIST_TYPE.WITH_DATE_OTHERS;
            }
        }
    }
    containers.get(listtype).addSeries(series);
}


window.onItemClick = function(id) {
    for (let container of containers.values()) {
        if (container.showFullItemIfExists(id)) {
            return;
        }
    }
}


function dateToLocaleString(date) {
    return date === "" ? "" : date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"});
}


function createLinkElement(site) {
    return `<a href="${site}" target="_blank" onclick="e.stopPropagation();">
            ${siteToShortLink(site)}
        </a>`;
}

function siteToShortLink(site) {
    let link = "";
    if (site.length > 0) {
        let a = document.createElement("a");
        a.href = site;
        if (a.host.length > 0) {
            link = a.host;
        }
    }
    return link;
}

