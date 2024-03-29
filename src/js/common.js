import * as constants from "./constants";


export function getByQuery(query) {
    return document.querySelector(query);
}


export function addClass(elem, cls) {
    if (elem) {
        elem.classList.add(cls);
    }
}


export function removeClass(elem, cls) {
    if (elem) {
        elem.classList.remove(cls);
    }
}


export function hideElement(elem) {
    addClass(elem, "hide");
}


export function showElement(elem) {
    removeClass(elem, "hide");
}


export function parseHtml(html) {
    let template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
}


export function animate({duration, draw, timing = (timeFraction) => timeFraction, complete = null}) {
    let start = performance.now();
    requestAnimationFrame(function animate(time) {
        let timeFraction = (time - start) / duration;
        if (timeFraction > 1) {
            timeFraction = 1;
        }
        draw(timing(timeFraction));
        if (timeFraction < 1) {
            requestAnimationFrame(animate);
        } else if (complete) {
            complete();
        }
    });
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
    if (site.length > 0) {
        let a = document.createElement("a");
        a.target = "_blank";
        a.href = site;
        if (a.host.length > 0) {
            a.innerText = a.host;
        }
        return a;
    } else {
        return "";
    }
}


export function getTodayDate() {
    let today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}


export function getSeriesListType(series) {
    let listType;
    if (series.data.status === constants.STATUS.COMPLETED) {
        listType = constants.LIST_TYPE.COMPLETED;
    } else if (series.data.status === constants.STATUS.PAUSE) {
        listType = constants.LIST_TYPE.ON_PAUSE;
    } else if (series.data.status === constants.STATUS.JUST_WATCH) {
        listType = constants.LIST_TYPE.RELEASED_LONG_AGO;
    } else if (series.data.date === "") {
        listType = constants.LIST_TYPE.WITHOUT_DATE;
    } else {
        let today = getTodayDate();
        if (series.data.date < today) {
            listType = constants.LIST_TYPE.RELEASED;
        } else {
            today.setDate(today.getDate() + 7);
            if (series.data.date < today) {
                listType = constants.LIST_TYPE.RELEASED_NEXT_7_DAYS;
            } else {
                listType = constants.LIST_TYPE.WITH_DATE_OTHERS;
            }
        }
    }
    return listType;
}
