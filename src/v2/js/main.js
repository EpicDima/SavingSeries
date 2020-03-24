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
import {STATUS} from "./constants";


window.onresize = resize;
window.goBack = goBack;

window.onItemClick = openFullitem;
window.onSearchItemClick = onSearchItemClick;
window.openAddingElement = openAddingElement;

window.createBackup = createBackup;
window.loadBackup = loadBackup;
window.onOpenFile = onOpenFile;


document.getElementById("settingsSubmenuTitle").onclick = (e) => {
    e.stopPropagation();
    document.getElementById("settingsSubmenu").classList.toggle("show");
};


window.onclick = () => {
    $(".submenu.show").removeClass("show");
};


resize();

const database = new Database();
const containers = new Map();
let addingFullItem;
let searchBox;

database.connect(initialize);
setDayTimer();


function initialize() {
    addingFullItem = new AddingFullItem("add", relocateSeries);
    let inner = addingFullItem.createHtml();
    for (let i in constants.LIST_TYPE) {
        let k = constants.LIST_TYPE[i];
        let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k), relocateSeries);
        containers.set(k, container);
        inner += container.createHtml();
    }
    document.querySelector("main").innerHTML = inner;
    database.foreach(initialSplitSeries, onInitialSplitSeriesEnd);
    scrollToTop();

    searchBox = new SearchBox(containers);
}


function clearAll() {
    clearRuntime();
    localStorage.clear();
    database.clear();
}


function clearRuntime() {
    addingFullItem.remove();
    for (let container of containers.values()) {
        container.remove();
    }
    containers.clear();
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
    if (!listType) {
        listType = getSeriesListType(series);
    }
    containers.get(listType).addSeries(series);
}


function resize() {
    document.documentElement.style.fontSize =  `${getOneRemInPixels()}px`;
}


function openFullitem(id) {
    for (let container of containers.values()) {
        if (container.showFullItemIfExists(id)) {
            return;
        }
    }
}


function goBack() {
    localStorage.removeItem("version");
    history.replaceState({}, "", `../`);
    location.reload();
}


function onSearchItemClick(id) {
    document.activeElement.blur();
    openFullitem(id);
}


function openAddingElement() {
    addingFullItem.open();
}


function createBackup() {
    let request = database.getReadOnlyObjectStore().getAll();
    request.onsuccess = () => {
        let element = document.createElement("a");
        element.href = "data:text/plain;charset=utf-8,%EF%BB%BF" + encodeURIComponent(JSON.stringify(request.result));
        element.download = "backup.bin";
        element.click();
    };
}


function loadBackup() {
    if (confirm("Все имеющиеся данные будут очищены и заменены на новые. Вы согласны?")) {
        let element = document.createElement("input");
        element.type = "file";
        element.onchange = onOpenFile;
        element.click();
    }
}


function onOpenFile(event) {
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
                let temp = {
                    id: counterId++,
                    name: series.name,
                    season: series.season,
                    episode: series.episode,
                    date: series.date !== "" ? new Date(series.date) : "",
                    site: series.site !== "" ? series.site : "https://epicdima.github.io/SavingSeries/v2/",
                    image: "",
                    note: "",
                    status: STATUS.RUN
                };
                try {
                    if (temp.name !== "") {
                        let season = parseInt(temp.season);
                        let episode = parseInt(temp.episode);
                        if (season >= 1 && season <= 50
                                && episode >= 1 && episode <= 50000) {
                            objectStore.add(temp);
                        }
                    }
                } catch (e) {}
            }
            database.connect(initialize);
        }
    };
    reader.readAsText(event.target.files[0]);
}


function setDayTimer() {
    let tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTimeout(() => {
        clearRuntime();
        initialize();
        setDayTimer();
    }, tomorrow - new Date());
}
