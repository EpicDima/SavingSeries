import "bootstrap/dist/css/bootstrap.min.css";
import "../css/style.css";

import "jquery";
import "popper.js";
import "bootstrap";

import * as constants from "./constants";
import {scrollToTop, getTodayDate} from "./common";
import Series from "./series";
import HorizontalContainer from "./h-container";
import Database from "./database";


let database = new Database();
database.connect(initialize);

const containers = new Map();
let currentSeries = null;


function initialize() {
    let inner = "";
    for (let i in constants.LIST_TYPE) {
        let k = constants.LIST_TYPE[i];
        let container = new HorizontalContainer(k, constants.LIST_NAMES.get(k));
        containers.set(k, container);
        inner += container.createHtml();
    }
    document.getElementsByTagName("main")[0].innerHTML = inner;

    database.foreach(splitSeries, scrollToTop);
}

function clearAll() {
    database.clear();
}



function splitSeries(series) {
    series = Series.createSeries(series);
    let listtype;
    if (series.status === constants.STATUS.COMPLETED) {
        listtype = constants.LIST_TYPE.COMPLETED;
    } else if (series.status === constants.STATUS.PAUSE) {
        listtype = constants.LIST_TYPE.ON_PAUSE;
    } else if (series.status === constants.STATUS.JUST_WATCH) {
        listtype = constants.LIST_TYPE.RELEASED_LONG_AGO;
    } else if (series.date === "") {
        listtype = constants.LIST_TYPE.WITHOUT_DATE;
    } else {
        let today = getTodayDate();
        if (series.date < today) {
            listtype = constants.LIST_TYPE.RELEASED;
        } else {
            today.setDate(today.getDate() + 7);
            if (series.date < today) {
                listtype = constants.LIST_TYPE.RELEASED_NEXT_7_DAYS;
            } else {
                listtype = constants.LIST_TYPE.WITH_DATE_OTHERS;
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
};
