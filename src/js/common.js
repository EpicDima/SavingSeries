export function dateToLocaleString(date) {
    return date === "" ? "" : date.toLocaleDateString("ru", {year: "numeric", month: "long", day: "numeric"});
}


export function createLinkElement(site) {
    return `<a href="${site}" target="_blank" onclick="e.stopPropagation();">
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