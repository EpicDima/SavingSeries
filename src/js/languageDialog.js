import Dialog from "./dialog";

export default class LanguageDialog extends Dialog {
    constructor() {
        super("languageDialogTemplate", {closeOnBackdropClick: true});

        this.languageList = this.element.querySelector("#languageList");

        this.populateLanguages();
        this.setListeners();

        window.i18n.applyTo(this.element);
    }


    populateLanguages() {
        const availableLanguages = window.i18n.getAvailableLanguages();
        const currentLanguage = window.i18n.getCurrentLanguage();

        this.languageList.innerHTML = "";
        availableLanguages.forEach(lang => {
            const langElement = document.createElement("button");
            langElement.type = "button";
            // Иначе Safari пропускает кнопки по Tab
            langElement.tabIndex = 0;
            langElement.textContent = window.i18n.t(`lang_${lang}`);
            langElement.dataset.lang = lang;
            if (lang === currentLanguage) {
                langElement.classList.add("active");
                langElement.autofocus = true;
            }
            this.languageList.appendChild(langElement);
        });
    }


    setListeners() {
        super.setListeners();
        this.languageList.addEventListener("click", (event) => {
            const lang = event.target.dataset.lang;
            if (lang) {
                window.i18n.setLanguage(lang);
                this.close();
            }
        });

        document.addEventListener("languagechange", () => {
            this.populateLanguages();
            window.i18n.applyTo(this.element);
        });
    }
}
