import Dialog from "./dialog";

export default class LanguageDialog extends Dialog {
    constructor() {
        super("languageDialogTemplate", {closeOnBackdropClick: true});

        this.languageList = document.createElement("div");
        this.languageList.id = "languageList";
        this.element.appendChild(this.languageList);

        this.populateLanguages();
        this.setListeners();

        window.i18n.applyTo(this.element);
    }


    populateLanguages() {
        const availableLanguages = window.i18n.getAvailableLanguages();
        const currentLanguage = window.i18n.getCurrentLanguage();

        this.languageList.innerHTML = "";
        availableLanguages.forEach(lang => {
            const langElement = document.createElement("div");
            langElement.textContent = window.i18n.t(`lang_${lang}`);
            langElement.dataset.lang = lang;
            if (lang === currentLanguage) {
                langElement.classList.add("active");
            }
            this.languageList.appendChild(langElement);
        });
    }


    setListeners() {
        super.setListeners();
        this.languageList.addEventListener("click", (event) => {
            const lang = event.target.dataset.lang;
            if (lang) {
                window.i18n.setLanguage(lang).then(_ => {
                });
                this.close();
            }
        });

        document.addEventListener("languagechange", () => {
            this.populateLanguages();
            const currentLanguage = window.i18n.getCurrentLanguage();
            this.languageList.querySelectorAll("[data-lang]").forEach(el => {
                el.classList.toggle("active", el.dataset.lang === currentLanguage);
            });
            window.i18n.applyTo(this.element);
        });
    }
}
