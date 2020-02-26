import "../css/style.scss";

import "jquery";
import "jquery-validation";
import "jquery-validation/dist/localization/messages_ru";

import * as constants from "./constants";
import {scrollToTop, getSeriesListType} from "./common";
import Series from "./series";
import HorizontalContainer from "./h-container";
import Database from "./database";
import {AddingFullItem} from "./fullitem";

resize();

const database = new Database();
const containers = new Map();
let addingFullItem = new AddingFullItem("add", relocateSeries);
let activeContainer = null;

let main = document.querySelector("main");

database.connect(initialize);


function initialize() {
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

window.onresize = resize;

function resize() {
    let size = window.innerWidth / 85;
    document.documentElement.style.fontSize =  `${size < 12 ? 12 : size}px`;
}
