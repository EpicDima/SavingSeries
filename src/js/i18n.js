(function () {
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
        if (getLocale(lang)) {
            translations[lang] = getLocale(lang);
            return true;
        }
        const baseLang = lang.split('-')[0];
        if (baseLang !== lang && getLocale(baseLang)) {
            translations[lang] = getLocale(baseLang);
            translations[baseLang] = getLocale(baseLang);
            return true;
        }
        console.error(`Translation file for "${lang}" not found, falling back to "${DEFAULT_LANGUAGE}".`);
        if (lang !== DEFAULT_LANGUAGE) {
            loadTranslations(DEFAULT_LANGUAGE);
        }
        return false;
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
                const key = element.getAttribute(attribute);
                if (translations[lang] && translations[lang][key]) {
                    element[property] = translations[lang][key];
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
        if (titleElement) {
            const key = titleElement.getAttribute(I18N_KEY_ATTRIBUTE);
            if (translations[currentLanguage] && translations[currentLanguage][key]) {
                document.title = translations[currentLanguage][key];
            }
        }
    }


    async function setLanguage(lang) {
        if (lang === currentLanguage && translations[lang]) {
            return;
        }

        if (!translations[lang]) {
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
        for (const placeholder in replacements) {
            translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }


    function getCurrentLanguage() {
        return currentLanguage;
    }


    function getAvailableLanguages() {
        return Object.keys(LOCALES).map(path => path.match(/([a-zA-Z-]+)\.json$/)[1]);
    }


    async function init() {
        const preferredLanguage = localStorage.getItem("preferredLanguage");
        const browserLanguage = navigator.language;
        const initialLang = preferredLanguage || browserLanguage || DEFAULT_LANGUAGE;
        await setLanguage(initialLang);
    }

    window.i18n = {
        setLanguage,
        applyTo: applyTranslations,
        t,
        init,
        getCurrentLanguage,
        getAvailableLanguages,
    };

    document.addEventListener("DOMContentLoaded", window.i18n.init);
})();
