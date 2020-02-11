import "bootstrap/dist/css/bootstrap.min.css";
import "../css/style.css";

import "jquery";
import "popper.js";
import "bootstrap";

import * as constants from "./constants";
import {scrollToTop, getSeriesListType} from "./common";
import Series from "./series";
import HorizontalContainer from "./h-container";
import Database from "./database";


let database = new Database();
database.connect(initialize);

const containers = new Map();
let activeContainer = null;


function initialize() {

    // database.putSeriesInDb(new Series(1, "Игра престолов", 8, 3, "", "https://kinogo.by", "", STATUS.RUN, "Так себе сезон"));
    // database.putSeriesInDb(new Series(2, "Мастера меча онлайн", 3, 37, "", "https://amedia.online/163-mastera-mecha-onlayn-3/episode/37/seriya-onlayn.html", "", STATUS.RUN, "Ждём-с"));

    let inner = "";
    for (let i in constants.LIST_TYPE) {
        let k = constants.LIST_TYPE[i];
        let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k), relocateSeries);
        containers.set(k, container);
        inner += container.createHtml();
    }
    document.getElementsByTagName("main")[0].innerHTML = inner;
    database.foreach(initialSplitSeries, onInitialSplitSeriesEnd);
}

function clearAll() {
    database.clear();
}


function initialSplitSeries(series) {
    series = Series.createSeries(series);
    containers.get(getSeriesListType(series)).initialAddSeries(series);
}

function onInitialSplitSeriesEnd() {
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
