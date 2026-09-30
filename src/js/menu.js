import {hideElement} from "./common";
import SearchContainer from "./searchContainer";
import LanguageDialog from "./languageDialog";


export class Menu {

    constructor(app) {
        this.app = app;
        this.search = new SearchContainer(app);
        this.languageDialog = new LanguageDialog();

        this.generate();
    }


    getFragment() {
        return this.header;
    }


    generate() {
        const template = document.getElementById("menuTemplate");
        const fragment = template.content.cloneNode(true);

        this.header = fragment.querySelector("header");
        this.navbar = fragment.querySelector(".navbar");
        this.logo = fragment.querySelector(".logo");
        this.settingsSubMenu = fragment.getElementById("settingsSubMenu");
        this.settingsSubMenuTitle = fragment.getElementById("settingsSubMenuTitle");
        this.openAddingElementMenuItem = fragment.getElementById("openAddingElementMenuItem");
        this.createBackupSubMenuItem = fragment.getElementById("createBackupSubMenuItem");
        this.loadBackupSubMenuItem = fragment.getElementById("loadBackupSubMenuItem");
        this.changeLanguageSubMenuItem = fragment.getElementById("changeLanguageSubMenuItem");

        this.navbar.firstElementChild.insertAdjacentElement("afterend", this.search.getFragment());
        let position = this.app.localStorage.getNavBarPosition();
        if (position) {
            this.navbar.style.position = position;
            this.search.searchList.style.position = position;
        }

        this.setListeners();
    }


    setListeners() {
        this.logo.onclick = () => this.app.refresh();

        this.settingsSubMenuTitle.onclick = (e) => this.toggleSubMenu(e);
        document.addEventListener("click", (e) => {
            if (!this.settingsSubMenu.contains(e.target) && !this.settingsSubMenuTitle.contains(e.target)) {
                this.hideSubMenu();
            }
        });

        this.openAddingElementMenuItem.onclick = () => this.app.toggleAddingElement();
        this.createBackupSubMenuItem.onclick = () => this.app.backup.createBackup();
        this.loadBackupSubMenuItem.onclick = () => this.app.backup.loadBackup();
        this.changeLanguageSubMenuItem.onclick = () => this.languageDialog.open();

        this.navbar.addEventListener("dblclick", () => {
            const position = this.navbar.style.position === "absolute" ? "fixed" : "absolute";
            this.navbar.style.position = position;
            this.search.searchList.style.position = position;
            this.app.localStorage.setNavBarPosition(position);
        });
    }


    clear() {
        this.search.clear();
    }


    toggleSubMenu(e) {
        e.stopPropagation();
        this.settingsSubMenu.classList.toggle("hide");
    }


    hideSubMenu() {
        hideElement(this.settingsSubMenu);
    }
}
