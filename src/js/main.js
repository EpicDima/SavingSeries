import "../css/style.scss";

import "jquery";
import "jquery-validation";
import "jquery-validation/dist/localization/messages_ru";
import "popper.js";
import "bootstrap";

import * as constants from "./constants";
import {scrollToTop, getSeriesListType} from "./common";
import Series from "./series";
import HorizontalContainer from "./h-container";
import Database from "./database";
import {AddingFullItem} from "./fullitem";
import {STATUS} from "./constants";


const database = new Database();
const containers = new Map();
let addingFullItem = new AddingFullItem("add", relocateSeries);
let activeContainer = null;

let main = document.getElementById("main");

database.connect(initialize);


function initialize() {

    // database.putSeriesInDb(new Series(1, "Игра престолов", 8, 3, "", "https://kinogo.by", "", STATUS.RUN, "Так себе сезон"));
    // database.putSeriesInDb(new Series(2, "Мастера меча онлайн", 3, 37, "", "https://amedia.online/163-mastera-mecha-onlayn-3/episode/37/seriya-onlayn.html", "", STATUS.RUN, "Ждём-с"));

    let inner = addingFullItem.createHtml();
    for (let i in constants.LIST_TYPE) {
        let k = constants.LIST_TYPE[i];
        let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k), relocateSeries);
        containers.set(k, container);
        inner += container.createHtml();
    }
    main.innerHTML = inner;
    database.foreach(initialSplitSeries, onInitialSplitSeriesEnd);
}

function clearAll() {
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
    scrollToTop();
}

function relocateSeries(series, listType) {
    if (listType === undefined) {
        listType = getSeriesListType(series);
    }
    containers.get(getSeriesListType(series)).addSeries(series);
}

window.onItemClick = function(id) {
    for (let container of containers.values()) {
        if (container.showFullItemIfExists(id)) {
            activeContainer = container;
            return;
        }
    }
};

window.openAddingElement = function () {
    addingFullItem.open();
};
