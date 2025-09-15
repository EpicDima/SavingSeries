import {getByQuery} from "./common";


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
        const template = document.getElementById("dialogTemplate");
        this.fragment = template.content.cloneNode(true);
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
        }
    }


    closeDialog() {
        this.dialog.close();
        this.dialog.remove();
    }
}
