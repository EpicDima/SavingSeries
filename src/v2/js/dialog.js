import {getByQuery, parseHtml} from "./common";


export default class Dialog {

    constructor(text) {
        this.text = text;
        this.generate();
    }


    open() {
        return new Promise(resolve => {
            if (this.showModal) {
                this.acceptButton.onclick = () => {
                    this.closeDialog();
                    resolve(true);
                };
                this.cancelButton.onclick = () => {
                    this.closeDialog();
                    resolve(false);
                };
                this.dialog.showModal();
            } else {
                resolve(confirm(this.text));
            }
        });
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.dialog = this.fragment.querySelector("dialog");

        if (typeof this.dialog.showModal === "function") {
            this.showModal = true;

            this.title = this.fragment.querySelector(".title");
            this.acceptButton = this.fragment.querySelector(".accept");
            this.cancelButton = this.fragment.querySelector(".cancel");

            this.title.innerText = this.text;

            getByQuery("body").append(this.dialog);
        } else {
            this.showModal = false;
            this.dialog.remove();
        }
    }


    createHtml() {
        return `<dialog>
            <div class="title"></div>
            <div class="button-container">
                <button class="accept">ОК</button>
                <button class="cancel">Отмена</button>
            </div>
        </dialog>`;
    }


    closeDialog() {
        this.dialog.close();
        this.dialog.remove();
    }
}
