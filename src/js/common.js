import * as constants from "./constants";

export function getOneRemInPixels() {
    return window.innerWidth / 85;
}

export function dateToLocaleString(series) {
    if (series) {
        if (series.data.date) {
            return series.data.date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"});
        }
    }
    return "";
}

export function dateObjectToInputString(series) {
    if (series) {
        if (series.data.date) {
            return series.data.date.toISOString().split("T")[0];
        }
    }
    return "";
}

export function dateInputStringToObject(date) {
    return date === "" ? "" : new Date(date);
}

export function createLinkElement(site) {
    return `<a href="${site}" target="_blank" onclick="event.stopPropagation();">
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

export function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

export function getTodayDate() {
    let today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}

export function getSeriesListType(series) {
    let listtype;
    if (series.data.status === constants.STATUS.COMPLETED) {
        listtype = constants.LIST_TYPE.COMPLETED;
    } else if (series.data.status === constants.STATUS.PAUSE) {
        listtype = constants.LIST_TYPE.ON_PAUSE;
    } else if (series.data.status === constants.STATUS.JUST_WATCH) {
        listtype = constants.LIST_TYPE.RELEASED_LONG_AGO;
    } else if (series.data.date === "") {
        listtype = constants.LIST_TYPE.WITHOUT_DATE;
    } else {
        let today = getTodayDate();
        if (series.data.date < today) {
            listtype = constants.LIST_TYPE.RELEASED;
        } else {
            today.setDate(today.getDate() + 7);
            if (series.data.date < today) {
                listtype = constants.LIST_TYPE.RELEASED_NEXT_7_DAYS;
            } else {
                listtype = constants.LIST_TYPE.WITH_DATE_OTHERS;
            }
        }
    }
    return listtype;
}