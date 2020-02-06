"use strict"

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
    var transaction = db.transaction(["images"], 'readwrite');
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




$('#rightButton').click(function() {
    event.preventDefault();
    $('.list').animate({
        scrollLeft: "+=800"
    }, 350);
});
  
$('#leftButton').click(function() {
    event.preventDefault();
    $('.list').animate({
        scrollLeft: "-=800"
    }, 350);
});







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

let statusElements = document.getElementsByName("status");
for (const element of statusElements) {
    element.innerHTML = "";
    for (const i in STATUS) {
        element.innerHTML += `<option value="${STATUS[i]}">${STATUS_STRING.get(STATUS[i])}</option>`;
    }
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


let seriesList = new Map();

let currentId = -1;

init();


function init() {
    let inner = "";
    for (let i in LIST_TYPE) {
        let k = LIST_TYPE[i];
        seriesList.set(k, new Map());
        let title = LIST_NAMES.get(k);
        inner += `<div id="hlc${k}" class="hlist-container"><div class="title">${title}</div><div class="outer-list"><div id="hlcList${k}" class="list"></div><div class="left-icon-control" id="leftButton${k}"></div><div class="right-icon-control" id="rightButton${k}"></div></div><div id="fullitem${k}" class="fullitem collapse"><button type="button" class="close" aria-label="Close"><span aria-hidden="true">&#10006;</span></button><div id="image${k}" class="image"></div><div class="gradient"></div><div id="name${k}" class="name"></div><div class="content"><form name="change${k}" onsubmit="return!1"><div id="season${k}" class="row"><div class="col-3 label">Сезон</div><div class="col-8 value"></div><div class="col-5 input"><input name="season" type="number"></div></div><div id="episode${k}" class="row"><div class="col-3 label">Серия</div><div class="col-8 value"></div><div class="col-5 input"><input name="episode" type="number"></div></div><div id="date${k}" class="row"><div class="col-3 label">Дата</div><div class="col-8 value"></div><div class="col-5 input"><input name="date" type="date"></div></div><div id="site${k}" class="row"><div class="col-3 label">Сайт</div><div class="col-8 value"></div><div class="col-5 input"><input name="site" type="url"></div></div><div id="image${k}" class="row"><div class="col-3 label">Изображение</div><div class="col-8 value"></div><div class="col-5 input"><input name="image" type="file"></div></div><div id="status${k}" class="row"><div class="col-3 label">Статус</div><div class="col-8 value"></div><div class="col-5 input"><select name="status"></select></div></div><div id="note${k}" class="row"><div class="col-3 label">Заметки</div><div class="col-8 value"></div><div class="col-5 input"><textarea name="note"></textarea></div></div></form></div><div class="button-container row"><div id="changeButton${k}" class="col-3 change-button"><button>Редактировать</button></div><div id="cancelButton${k}" class="col-3 cancel-button"><button>Отмена</button></div><div id="acceptButton${k}" class="col-3 accept-button"><button>Подтвердить</button></div><div id="deleteButton${k}" class="col-3 delete-button"><button>Удалить</button></div></div></div></div>`;
    }
    document.getElementsByTagName("main")[0].innerHTML = inner;
}



let seriesListDatabase = [
    {id: 1, name: "Игра престолов", season: 8, episode: 7, date: "", site: "https://kinogo.by", note: "Слили финал конечно", status: STATUS.WATCH, image: ""},
    {id: 2, name: "Очень странные дела", season: 4, episode: 1, date: "", site: "https://kinogo.by", note: "", status: STATUS.RUN, image: ""}
];



function split(list) {
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
    seriesList[listtype].set(series.id, series);
}


function onItemClick(id) {
    for (let entry of seriesList.entries()) {
        if (entry[1].has(id)) {
            setValueInFullItem(entry[1].get(id), entry[0]);
            $(".collapsing .show").hide();
            $(`#fullitem${entry[0]}`).eq().show();
        }
    }
}


function dateToLocaleString(date) {
    return date === "" ? "" : date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"});
}


function createLinkElement(site) {
    return `<a href="${site}" target="_blank" onclick="event.stopPropagation();">
            ${siteToShortLink(site)}
        </a>`;
}


function setValueInFullItem(series, key) {
    currentId = series.id;
    $(`#name${key}`).value = series.name;
    $(`#image${key}`).style.backgroundImage = `url("${series.image}")`;
    $(`#season${key} .value`).value = series.season;
    $(`#season${key} input`).value = series.season;
    $(`#episode${key} .value`).value = series.episode;
    $(`#episode${key} input`).value = series.episode;
    let date = dateToLocaleString(series.date);
    $(`#date${key} .value`).value = date;
    $(`#date${key} input`).value = date;
    $(`#site${key} .value`).value = createLinkElement(series.site);
    $(`#site${key} input`).value = series.site;
    $(`#image${key} .value`).style.backgroundImage = `url("${series.image}")`;
    $(`#image${key} input`).value = "";
    $(`#status${key} .value`).value = STATUS_STRING[series.status];
    $(`#status${key} input`).selectedIndex = series.status;
    $(`#note${key} .value`).value = series.note;
    $(`#note${key} input`).innerHTML = series.note;
}