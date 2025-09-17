import {getByQuery} from "./common";


export default class Dialog {

    constructor(templateId, options = {}) {
        this.templateId = templateId;
        this.options = options;
        this.generate();
    }


    open() {
        return new Promise(resolve => {
            if (this.dialog && typeof this.dialog.showModal === "function") {
                if (!this.dialog.parentElement) {
                    getByQuery("body").append(this.dialog);
                }
                this.setListeners();
                this.dialog.showModal();
            }
            resolve();
        });
    }


    close(result) {
        if (this.dialog && typeof this.dialog.close === "function") {
            this.dialog.close(result);
        }
    }


    generate() {
        const template = document.getElementById(this.templateId);
        if (!template) {
            console.error(`Template with id "${this.templateId}" not found.`);
            return;
        }
        const fragment = template.content.cloneNode(true);
        this.dialog = fragment.querySelector("dialog") || fragment.firstElementChild;

        if (!this.dialog) {
            console.error(`No dialog element found in template with id "${this.templateId}".`);
            return;
        }

        this.dialog.addEventListener("close", () => {
        });
    }


    setListeners() {
        if (this.listenersSet) {
            return;
        }
        this.dialog.addEventListener("click", (e) => {
            if (e.target === this.dialog && this.options.closeOnBackdropClick) {
                this.close();
            }
        });

        const closeButton = this.dialog.querySelector(".close");
        if (closeButton) {
            closeButton.onclick = () => this.close();
        }
        this.listenersSet = true;
    }

    get element() {
        return this.dialog;
    }
}
