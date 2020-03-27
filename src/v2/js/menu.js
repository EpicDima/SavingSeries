import {addClass, parseHtml} from "./common";
import SearchContainer from "./searchContainer";


export class Menu {

    constructor(app) {
        this.app = app;

        this.search = new SearchContainer(app);

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
        this.goBackSubMenuItem = this.fragment.getElementById("goBackSubMenuItem");

        this.navbar.firstElementChild.insertAdjacentElement("afterend", this.search.getFragment());

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
                                <div id="goBackSubMenuItem">Страница выбора</div>
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
        window.onclick = () => this.hideSubMenu();

        this.openAddingElementMenuItem.onclick = () => this.app.openAddingElement();
        this.createBackupSubMenuItem.onclick = this.app.backup.getCreateBackupFunction();
        this.loadBackupSubMenuItem.onclick = this.app.backup.getLoadBackupFunction();
        this.goBackSubMenuItem.onclick = () => this.goBack();
    }


    clear() {
        this.search.clear();
    }


    toggleSubMenu(e) {
        e.stopPropagation();
        this.settingsSubMenu.classList.toggle("hide");
    }


    hideSubMenu() {
        addClass(this.settingsSubMenu, "hide");
    }


    goBack() {
        this.app.localStorage.removeVersion();
        history.replaceState({}, "", `../`);
        location.reload();
    }
}
