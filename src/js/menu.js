import {hideElement, parseHtml} from "./common";
import SearchContainer from "./searchContainer";


export class Menu {

    constructor(app) {
        this.app = app;
        this.search = new SearchContainer(app);

        this.boundHandleClick = this.handleDocumentClick.bind(this);

        this.generate();
    }


    getFragment() {
        return this.header;
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.header = this.fragment.querySelector("header");
        this.navbar = this.fragment.querySelector(".navbar");
        this.logo = this.fragment.querySelector(".logo");
        this.settingsSubMenu = this.fragment.getElementById("settingsSubMenu");
        this.settingsSubMenuTitle = this.fragment.getElementById("settingsSubMenuTitle");
        this.openAddingElementMenuItem = this.fragment.getElementById("openAddingElementMenuItem");
        this.createBackupSubMenuItem = this.fragment.getElementById("createBackupSubMenuItem");
        this.loadBackupSubMenuItem = this.fragment.getElementById("loadBackupSubMenuItem");
        this.goToOldSubMenuItem = this.fragment.getElementById("goToOldSubMenuItem");

        this.navbar.firstElementChild.insertAdjacentElement("afterend", this.search.getFragment());
        let position = this.app.localStorage.getNavBarPosition();
        if (position) {
            this.navbar.style.position = position;
            this.search.searchList.style.position = position;
        }

        this.setListeners();
    }


    createHtml() {
        return `<header>
            <nav class="navbar">
                <div class="nav-item">
                    <div class="logo" title="SavingSeries">SavingSeries</div>
                </div>
                <div class="nav-item">
                    <ul>
                        <li>
                            <div id="openAddingElementMenuItem">Добавление</div>
                        </li>
                        <li>
                            <div id="settingsSubMenuTitle" class="submenu-title">Настройки</div>
                            <div id="settingsSubMenu" class="submenu hide">
                                <div id="createBackupSubMenuItem">Создать Backup</div>
                                <div id="loadBackupSubMenuItem">Загрузить Backup</div>
                                <div id="goToOldSubMenuItem">Устаревшая версия</div>
                            </div>
                        </li>
                    </ul>
                </div>
            </nav>
        </header>`;
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
        this.goToOldSubMenuItem.onclick = () => this.goToOld();

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


    goToOld() {
        history.replaceState({}, "", `/SavingSeries/v1`);
        location.reload();
    }

    handleDocumentClick(e) {
        if (!this.settingsSubMenu.contains(e.target) && !this.settingsSubMenuTitle.contains(e.target)) {
            this.hideSubMenu();
        }
    }
}
