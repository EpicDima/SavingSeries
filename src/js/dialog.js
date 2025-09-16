import {getByQuery} from "./common";


export default class Dialog {

    constructor(templateId, options = {}) {
        this.templateId = templateId;
        this.options = options;
        this.generate();
    }

    open() {
        if (this.dialog && typeof this.dialog.showModal === "function") {
            this.dialog.showModal();
        }
    }

    close() {
        if (this.dialog && typeof this.dialog.close === "function") {
            this.dialog.close();
        }
    }

    generate() {
        const template = document.getElementById(this.templateId);
        if (!template) {
            console.error(`Template with id "${this.templateId}" not found.`);
            return;
        }
        this.fragment = template.content.cloneNode(true);
        this.dialog = this.fragment.querySelector("dialog");

        if (!this.dialog) {
            this.dialog = this.fragment.firstElementChild;
        }

        if (!this.dialog) {
            console.error(`No dialog element found in template with id "${this.templateId}".`);
            return;
        }

        getByQuery("body").append(this.dialog);
    }

    setListeners() {
        this.dialog.addEventListener("click", (e) => {
            if (e.target === this.dialog && this.options.closeOnBackdropClick) {
                this.close();
            }
        });

        const closeButton = this.dialog.querySelector(".close-button");
        if (closeButton) {
            closeButton.onclick = () => this.close();
        }
    }

    get element() {
        return this.dialog;
    }
}
