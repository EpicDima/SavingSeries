const I18N_KEY_ATTRIBUTE = "data-i18n-key";
const I18N_TITLE_ATTRIBUTE = "data-i18n-title";
const I18N_PLACEHOLDER_ATTRIBUTE = "data-i18n-placeholder";
const DEFAULT_LANGUAGE = "en";

const LOCALES = import.meta.glob("../locales/*.json", {eager: true, import: "default"});

const translations = {};
let currentLanguage = DEFAULT_LANGUAGE;


function getLocale(lang) {
    return LOCALES[`../locales/${lang}.json`];
}


function loadTranslations(lang) {
    const dictionary = getLocale(lang) || getLocale(lang.split("-")[0]);
    if (dictionary) {
        translations[lang] = dictionary;
    }
    return Boolean(dictionary);
}


/**
 * @param {Document|HTMLElement} rootElement
 */
function applyTranslations(rootElement = document) {
    if (!translations[currentLanguage]) {
        return;
    }

    const lang = currentLanguage;

    const translate = (element, attribute, property) => {
        if (element.hasAttribute(attribute)) {
            const text = translations[lang][element.getAttribute(attribute)];
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
    const title = titleElement && translations[currentLanguage][titleElement.getAttribute(I18N_KEY_ATTRIBUTE)];
    if (title) {
        document.title = title;
    }
}


function setLanguage(lang) {
    if (lang === currentLanguage && translations[lang]) {
        return;
    }

    if (!translations[lang] && !loadTranslations(lang)) {
        console.error(`Translation file for "${lang}" not found, falling back to "${DEFAULT_LANGUAGE}".`);
        lang = DEFAULT_LANGUAGE;
        loadTranslations(lang);
    }

    currentLanguage = lang;
    document.documentElement.lang = lang;
    applyTranslations(document.body);
    updatePageTitle();

    localStorage.setItem("preferredLanguage", lang);

    document.dispatchEvent(new CustomEvent("languagechange"));
}


function t(key, replacements = {}) {
    let translation = translations[currentLanguage]?.[key] || key;
    for (const [name, value] of Object.entries(replacements)) {
        translation = translation.replaceAll(`{${name}}`, () => value);
    }
    return translation;
}


function getCurrentLanguage() {
    return currentLanguage;
}


function getAvailableLanguages() {
    return Object.keys(LOCALES).map(path => path.match(/([a-zA-Z-]+)\.json$/)[1]);
}


function init() {
    const preferredLanguage = localStorage.getItem("preferredLanguage");
    const browserLanguage = navigator.language;
    const initialLang = preferredLanguage || browserLanguage || DEFAULT_LANGUAGE;
    setLanguage(initialLang);
}

window.i18n = {
    setLanguage,
    applyTo: applyTranslations,
    t,
    getCurrentLanguage,
    getAvailableLanguages,
};

document.addEventListener("DOMContentLoaded", init);
