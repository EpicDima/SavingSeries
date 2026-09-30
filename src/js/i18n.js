const I18N_KEY_ATTRIBUTE = "data-i18n-key";
const I18N_TITLE_ATTRIBUTE = "data-i18n-title";
const I18N_PLACEHOLDER_ATTRIBUTE = "data-i18n-placeholder";
const DEFAULT_LANGUAGE = "en";

const LOCALES = import.meta.glob("../locales/*.json", {eager: true, import: "default"});

let currentLanguage = DEFAULT_LANGUAGE;
let locale = DEFAULT_LANGUAGE;
let dictionary = {};


function getDictionary(lang) {
    return LOCALES[`../locales/${lang}.json`];
}


// «en-US» без своего словаря сводится к «en»
function findLanguage(languageTag) {
    if (!languageTag) {
        return null;
    }
    return [languageTag, languageTag.split("-")[0]].find(lang => getDictionary(lang)) ?? null;
}


/**
 * @param {Document|HTMLElement} rootElement
 */
function applyTranslations(rootElement = document) {
    const translate = (element, attribute, property) => {
        if (element.hasAttribute(attribute)) {
            const text = dictionary[element.getAttribute(attribute)];
            if (text) {
                element[property] = text;
            }
        }
    };

    const elements = rootElement.querySelectorAll(`[${I18N_KEY_ATTRIBUTE}], [${I18N_TITLE_ATTRIBUTE}], [${I18N_PLACEHOLDER_ATTRIBUTE}]`);
    elements.forEach(element => {
        translate(element, I18N_KEY_ATTRIBUTE, "textContent");
        translate(element, I18N_TITLE_ATTRIBUTE, "title");
        translate(element, I18N_PLACEHOLDER_ATTRIBUTE, "placeholder");
    });
}


function updatePageTitle() {
    const titleElement = document.querySelector(`title[${I18N_KEY_ATTRIBUTE}]`);
    const title = titleElement && dictionary[titleElement.getAttribute(I18N_KEY_ATTRIBUTE)];
    if (title) {
        document.title = title;
    }
}


// Регион браузера сохраняется для формата дат, если язык тот же
function applyLanguage(lang) {
    currentLanguage = lang;
    dictionary = getDictionary(lang);
    locale = findLanguage(navigator.language) === lang ? navigator.language : lang;
    document.documentElement.lang = locale;
    applyTranslations(document.body);
    updatePageTitle();
    document.dispatchEvent(new CustomEvent("languagechange"));
}


function setLanguage(lang) {
    localStorage.setItem("preferredLanguage", lang);
    if (lang !== currentLanguage) {
        applyLanguage(lang);
    }
}


function t(key, replacements = {}) {
    let translation = dictionary[key] || key;
    for (const [name, value] of Object.entries(replacements)) {
        translation = translation.replaceAll(`{${name}}`, () => value);
    }
    return translation;
}


function getCurrentLanguage() {
    return currentLanguage;
}


function getLocale() {
    return locale;
}


function getAvailableLanguages() {
    return Object.keys(LOCALES).map(path => path.match(/([a-zA-Z-]+)\.json$/)[1]);
}


function init() {
    applyLanguage(findLanguage(localStorage.getItem("preferredLanguage"))
        ?? findLanguage(navigator.language) ?? DEFAULT_LANGUAGE);
}

window.i18n = {
    setLanguage,
    applyTo: applyTranslations,
    t,
    getCurrentLanguage,
    getLocale,
    getAvailableLanguages,
};

document.addEventListener("DOMContentLoaded", init);
