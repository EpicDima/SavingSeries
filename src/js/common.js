import * as constants from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;


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


// Дата сериала — календарный день, хранится полночью UTC: так её отдаёт поле ввода
export function dateToLocaleString(date) {
    if (!date) {
        return "";
    }
    return date.toLocaleDateString(window.i18n.getCurrentLanguage(), {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC"
    });
}


// Раньше «Далее» шагал по местному времени, и переход на летнее время сдвигал полночь на час
export function roundToUtcDay(date) {
    return new Date(Math.round(date / DAY_MS) * DAY_MS);
}


export function dateObjectToInputString(date) {
    return date ? date.toISOString().split("T")[0] : "";
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


// Отсеивает строку "undefined" от старых версий: иначе браузер запрашивает /undefined
export function isImage(image) {
    return typeof image === "string" && image.startsWith("data:");
}


export function imageToCssUrl(image) {
    return isImage(image) ? `url("${image}")` : "";
}


// Сегодняшний местный день в том же виде, что и даты сериалов
function getTodayUtcDay() {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
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
        const today = getTodayUtcDay();
        if (series.data.date < today + DAY_MS) {
            listType = constants.LIST_TYPE.RELEASED;
        } else if (series.data.date < today + 8 * DAY_MS) {
            listType = constants.LIST_TYPE.RELEASED_NEXT_7_DAYS;
        } else {
            listType = constants.LIST_TYPE.WITH_DATE_OTHERS;
        }
    }
    return listType;
}


export function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
