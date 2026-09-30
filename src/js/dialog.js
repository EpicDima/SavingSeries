import {getByQuery} from "./common";


export default class Dialog {

    constructor(templateId, options = {}) {
        this.templateId = templateId;
        this.options = options;
        this.generate();
    }


    open() {
        if (!this.dialog.isConnected) {
            getByQuery("body").append(this.dialog);
        }
        this.dialog.showModal();
    }


    close(result) {
        this.dialog.close(result);
    }


    generate() {
        const template = document.getElementById(this.templateId);
        this.dialog = template.content.querySelector("dialog").cloneNode(true);
    }


    // Наследники вызывают один раз из конструктора
    setListeners() {
        let pressedOnBackdrop = false;
        this.dialog.addEventListener("pointerdown", (e) => pressedOnBackdrop = this.isOnBackdrop(e));
        this.dialog.addEventListener("click", (e) => {
            if (this.options.closeOnBackdropClick && pressedOnBackdrop && this.isOnBackdrop(e)) {
                this.close();
            }
        });

        const closeButton = this.dialog.querySelector(".close");
        if (closeButton) {
            closeButton.onclick = () => this.close();
        }
    }


    // Клик по собственному отступу окна тоже приходит с target === dialog
    isOnBackdrop(event) {
        const rect = this.dialog.getBoundingClientRect();
        return event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right
            || event.clientY < rect.top || event.clientY > rect.bottom);
    }

    get element() {
        return this.dialog;
    }
}
