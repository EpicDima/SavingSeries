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
                this.dialog.addEventListener("close", () => {
                    this.dialog.remove();
                    resolve(this.dialog.returnValue === "true");
                }, {once: true});

                this.acceptButton.onclick = () => this.close("true");
                this.cancelButton.onclick = () => this.close("false");

                getByQuery("body").append(this.dialog);
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
}
