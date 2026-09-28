import {getByQuery} from "./common";
import Dialog from "./dialog";


export default class AlertDialog extends Dialog {

    constructor(text) {
        super("alertDialogTemplate", {closeOnBackdropClick: true});
        this.element.querySelector(".title").innerText = text;
        this.setListeners();
        window.i18n.applyTo(this.element);
    }


    open() {
        return new Promise(resolve => {
            this.dialog.addEventListener("close", () => {
                this.dialog.remove();
                resolve(this.dialog.returnValue === "true");
            }, {once: true});
            getByQuery("body").append(this.dialog);
            this.dialog.showModal();
        });
    }
}
