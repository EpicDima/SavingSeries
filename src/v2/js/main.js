import "../css/style.scss";

import "jquery";
import "jquery-validation";
import "jquery-validation/dist/localization/messages_ru";

import * as constants from "./constants";
import {getOneRemInPixels, scrollToTop, getSeriesListType} from "./common";
import Series from "./series";
import HorizontalContainer from "./h-container";
import Database from "./database";
import {AddingFullItem} from "./fullitem";
import SearchBox from "./search-box";

resize();

const database = new Database();
const containers = new Map();
let addingFullItem;

new SearchBox(containers);

let main = document.querySelector("main");

database.connect(initialize);


function initialize() {
    addingFullItem = new AddingFullItem("add", relocateSeries);
    let inner = addingFullItem.createHtml();
    for (let i in constants.LIST_TYPE) {
        let k = constants.LIST_TYPE[i];
        let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k), relocateSeries);
        containers.set(k, container);
        inner += container.createHtml();
    }
    main.innerHTML = inner;
    database.foreach(initialSplitSeries, onInitialSplitSeriesEnd);
    scrollToTop();
}

function clearAll() {
    addingFullItem.remove();
    for (let container of containers.values()) {
        container.remove();
    }
    containers.clear();
    database.clear();
}


function initialSplitSeries(series) {
    series = Series.createSeries(series);
    containers.get(getSeriesListType(series)).initialAddSeries(series);
}

function onInitialSplitSeriesEnd(id) {
    addingFullItem.setSeriesId(id + 1);
    for (let container of containers.values()) {
        container.initialAdditionFinish();
    }
}

function relocateSeries(series, listType) {
    if (listType === undefined) {
        listType = getSeriesListType(series);
    }
    containers.get(listType).addSeries(series);
}


function resize() {
    document.documentElement.style.fontSize =  `${getOneRemInPixels()}px`;
}

window.onresize = resize;

function openFullitem(id) {
    for (let container of containers.values()) {
        if (container.showFullItemIfExists(id)) {
            return;
        }
    }
}

window.goBack = function() {
    localStorage.removeItem("version");
    history.replaceState({}, "", `../`);
    location.reload();
};

window.onItemClick = openFullitem;
window.onSearchItemClick = (id) => {document.activeElement.blur(); openFullitem(id);};

window.openAddingElement = function () {
    addingFullItem.open();
};

document.getElementById("settingsSubmenuTitle").onclick = (e) => {
    e.stopPropagation();
    document.getElementById("settingsSubmenu").classList.toggle("show");
};

window.onclick = () => {
    $(".submenu.show").removeClass("show");
};



window.createBackup = () => {
    let request = database.getReadOnlyObjectStore().getAll();
    request.onsuccess = () => {
        let element = document.createElement("a");
        element.href = "data:text/plain;charset=utf-8,%EF%BB%BF" + encodeURIComponent(JSON.stringify(request.result));
        element.download = "backup.bin";
        element.style.display = "none";
        element.click();
        element.remove();
    };
};

window.loadBackup = () => {
    if (confirm("Все имеющиеся данные будут очищены и заменены на новые. Вы согласны?")) {
        let element = document.createElement("input");
        element.type = "file";
        element.style.display = "none";
        element.onchange = onOpenFile;
        element.click();
        element.remove();
    }
};

window.onOpenFile = (event) => {
    let reader = new FileReader();
    reader.onload = event => {
        let data;
        try {
            data = JSON.parse(event.target.result);
        } catch (SyntaxError) {
            data = null;
        }
        if (!(data instanceof Array)) {
            alert("Содержимое файла повреждено!");
        } else {
            clearAll();
            let counterId = 0;
            let objectStore = database.getReadWriteObjectStore();
            for (let series of data) {
                series.id = counterId++;
                if (series.date !== "") {
                    series.date = new Date(series.date);
                }
                objectStore.add(series);
            }
            database.connect(initialize);
        }
    };
    reader.readAsText(event.target.files[0]);
};

window.goToFirstVersion = () => {
    let a = document.createElement("a");
    a.href = "../index.html";
    a.click();
    a.remove();
};
