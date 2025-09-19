import {hideElement} from "./common.js";
import SearchContainer from "./searchContainer";
import LanguageDialog from "./languageDialog";
import GoogleDriveIntegration from "./googleDriveIntegration";


export class Menu {

    constructor(app) {
        this.app = app;
        this.search = new SearchContainer(app);
        this.languageDialog = new LanguageDialog();
        this.googleDriveIntegration = new GoogleDriveIntegration(app);

        this.boundHandleClick = this.handleDocumentClick.bind(this);

        this.generate();

        // Initialize Google Drive integration
        this.googleDriveIntegration.init().catch(console.error);
    }


    getFragment() {
        return this.header;
    }


    generate() {
        const template = document.getElementById("menuTemplate");
        this.fragment = template.content.cloneNode(true);

        this.header = this.fragment.querySelector("header");
        this.navbar = this.fragment.querySelector(".navbar");
        this.logo = this.fragment.querySelector(".logo");
        this.settingsSubMenu = this.fragment.getElementById("settingsSubMenu");
        this.settingsSubMenuTitle = this.fragment.getElementById("settingsSubMenuTitle");
        this.openAddingElementMenuItem = this.fragment.getElementById("openAddingElementMenuItem");
        this.createBackupSubMenuItem = this.fragment.getElementById("createBackupSubMenuItem");
        this.loadBackupSubMenuItem = this.fragment.getElementById("loadBackupSubMenuItem");
        this.googleDriveSettingsSubMenuItem = this.fragment.getElementById("googleDriveSettingsSubMenuItem");
        this.backupToGoogleDriveSubMenuItem = this.fragment.getElementById("backupToGoogleDriveSubMenuItem");
        this.restoreFromGoogleDriveSubMenuItem = this.fragment.getElementById("restoreFromGoogleDriveSubMenuItem");
        this.changeLanguageSubMenuItem = this.fragment.getElementById("changeLanguageSubMenuItem");

        this.navbar.firstElementChild.insertAdjacentElement("afterend", this.search.getFragment());
        let position = this.app.localStorage.getNavBarPosition();
        if (position) {
            this.navbar.style.position = position;
            this.search.searchList.style.position = position;
        }

        this.setListeners();
    }


    setListeners() {
        this.logo.onclick = (e) => {
            e.preventDefault();
            this.app.refresh();
        };

        this.settingsSubMenuTitle.onclick = (e) => this.toggleSubMenu(e);
        document.addEventListener("click", this.boundHandleClick);

        this.openAddingElementMenuItem.onclick = () => this.app.openAddingElement();
        this.createBackupSubMenuItem.onclick = this.app.backup.getCreateBackupFunction();
        this.loadBackupSubMenuItem.onclick = this.app.backup.getLoadBackupFunction();

        // Google Drive menu items
        this.googleDriveSettingsSubMenuItem.onclick = () => this.googleDriveIntegration.showAuthDialog();
        this.backupToGoogleDriveSubMenuItem.onclick = () => this.googleDriveIntegration.backupToDrive();
        this.restoreFromGoogleDriveSubMenuItem.onclick = () => this.googleDriveIntegration.restoreFromDrive();
        
        this.changeLanguageSubMenuItem.onclick = () => this.languageDialog.open();

        this.navbar.addEventListener("dblclick", () => {
            let position = this.app.localStorage.getNavBarPosition();
            if (position === "absolute") {
                position = "fixed";
            } else {
                position = "absolute";
            }
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


    handleDocumentClick(e) {
        if (!this.settingsSubMenu.contains(e.target) && !this.settingsSubMenuTitle.contains(e.target)) {
            this.hideSubMenu();
        }
    }
}
