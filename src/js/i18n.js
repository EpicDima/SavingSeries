(function () {
    const I18N_KEY_ATTRIBUTE = "data-i18n-key";
    const I18N_TITLE_ATTRIBUTE = "data-i18n-title";
    const I18N_PLACEHOLDER_ATTRIBUTE = "data-i18n-placeholder";
    const DEFAULT_LANGUAGE = "en";

    const translations = {};
    let currentLanguage = DEFAULT_LANGUAGE;


    async function loadTranslations(lang) {
        try {
            const module = await import(`../locales/${lang}.json`);
            translations[lang] = module.default;
            return true;
        } catch (error) {
            const baseLang = lang.split('-')[0];
            if (baseLang !== lang) {
                try {
                    const module = await import(`../locales/${baseLang}.json`);
                    translations[lang] = module.default;
                    translations[baseLang] = module.default;
                    return true;
                } catch (e) {
                    // ignore
                }
            }
            console.error(`Translation file for "${lang}" not found, falling back to "${DEFAULT_LANGUAGE}".`, error);
            if (lang !== DEFAULT_LANGUAGE) {
                await loadTranslations(DEFAULT_LANGUAGE);
            }
            return false;
        }
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
            await loadTranslations(lang);
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
        const locales = import.meta.glob('../locales/*.json');
        return Object.keys(locales).map(path => path.match(/([a-zA-Z-]+)\.json$/)[1]);
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
