import {getByQuery} from "./common";
import Dialog from "./dialog";


export default class AlertDialog extends Dialog {

    constructor(text) {
        super("alertDialogTemplate", {closeOnBackdropClick: true});
        this.text = text;

        this.populate();
        this.setListeners();

        window.i18n.applyTo(this.element);
    }


    open() {
        return new Promise(resolve => {
            if (this.dialog && typeof this.dialog.showModal === "function") {
                const onClose = () => {
                    this.dialog.removeEventListener("close", onClose);
                    resolve(this.dialog.returnValue === "true");
                };
                this.dialog.addEventListener("close", onClose);

                this.acceptButton.onclick = () => this.close("true");
                this.cancelButton.onclick = () => this.close("false");

                if (!this.dialog.parentElement) {
                    getByQuery("body").append(this.dialog);
                }
                this.dialog.showModal();
            } else {
                resolve(confirm(this.text));
            }
        });
    }


    populate() {
        this.title = this.element.querySelector(".title");
        this.acceptButton = this.element.querySelector(".accept");
        this.cancelButton = this.element.querySelector(".cancel");
        if (this.title) {
            this.title.innerText = this.text;
        }
    }

    setListeners() {
        super.setListeners();
        document.addEventListener("languagechange", () => {
            this.generate();
            window.i18n.applyTo(this.element);
        });
    }
}
