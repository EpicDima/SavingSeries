import {hideElement} from "./common";
import SearchContainer from "./searchContainer";
import LanguageDialog from "./languageDialog";


export class Menu {

    constructor(app) {
        this.app = app;
        this.search = new SearchContainer(app);
        this.languageDialog = new LanguageDialog();

        this.boundHandleClick = this.handleDocumentClick.bind(this);

        this.generate();
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
        this.syncNowSubMenuItem = this.fragment.getElementById("syncNowSubMenuItem");
        this.syncStatus = this.fragment.getElementById("syncStatus");
        this.createBackupSubMenuItem = this.fragment.getElementById("createBackupSubMenuItem");
        this.loadBackupSubMenuItem = this.fragment.getElementById("loadBackupSubMenuItem");
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
        this.syncNowSubMenuItem.onclick = () => this.syncNow();
        this.createBackupSubMenuItem.onclick = this.app.backup.getCreateBackupFunction();
        this.loadBackupSubMenuItem.onclick = this.app.backup.getLoadBackupFunction();
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


    async syncNow() {
        this.hideSubMenu();
        this.setSyncNowEnabled(false);
        try {
            await this.app.syncNow();
        } catch (error) {
            console.error("Google Drive sync failed:", error);
        } finally {
            this.setSyncNowEnabled(true);
        }
    }


    updateSyncStatus(state = {}) {
        const status = state.status || "idle";
        this.syncStatus.dataset.status = status;
        this.syncStatus.textContent = this.#getSyncStatusText(state);
        this.syncStatus.title = state.lastError || this.syncStatus.textContent;
        this.setSyncNowEnabled(status !== "syncing" && status !== "syncing-images" && status !== "signing-in" && status !== "offline");
    }


    setSyncNowEnabled(enabled) {
        this.syncNowSubMenuItem.classList.toggle("disabled", !enabled);
    }


    #getSyncStatusText(state) {
        if (state.lastError && state.status === "error") {
            return window.i18n.t("sync_status_error");
        }

        const statusKey = `sync_status_${state.status || "idle"}`;
        const translated = window.i18n.t(statusKey);
        if (translated !== statusKey) {
            return translated;
        }
        return window.i18n.t("sync_status_idle");
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
