import {addClass, removeClass} from "./common";


export default class SearchContainer {

    static #ACTIVE_CLASS = "active";

    static #ARROW_DOWN_KEY = "ArrowDown";
    static #ARROW_UP_KEY = "ArrowUp";
    static #ENTER_KEY = "Enter";
    static #ESCAPE_KEY = "Escape";

    static #RESULT_COUNT = 10;


    constructor(app) {
        this.app = app;
        this.generate();
    }


    getFragment() {
        return this.container;
    }


    generate() {
        const template = document.getElementById("searchContainerTemplate");
        const fragment = template.content.cloneNode(true);

        this.container = fragment.querySelector(".search-container");
        this.search = fragment.querySelector(".search");
        this.searchList = fragment.querySelector(".search-list");
        this.closeButton = fragment.querySelector(".close");

        this.setListeners();
        this.clear();
    }


    setListeners() {
        this.search.oninput = () => this.searchSeries();
        // Сериалы могли измениться, пока поиск был закрыт
        this.search.onfocus = () => this.searchSeries();
        this.search.onkeydown = (e) => this.onKeyDown(e);
        this.searchList.onmousedown = (e) => this.onMouseDown(e);
        this.closeButton.onmousedown = (e) => e.preventDefault();
        this.closeButton.onclick = () => {
            this.clear();
            this.search.focus();
        };
    }


    clear() {
        this.search.value = "";
        this.searchList.innerHTML = "";
        this.activeItem = null;
    }


    onKeyDown(e) {
        if (e.isComposing) {
            return;
        }
        if (e.key === SearchContainer.#ARROW_DOWN_KEY || e.key === SearchContainer.#ARROW_UP_KEY) {
            e.preventDefault();
            this.moveActiveItem(e.key === SearchContainer.#ARROW_DOWN_KEY);
        } else if (e.key === SearchContainer.#ENTER_KEY) {
            this.activeItem?.click();
        } else if (e.key === SearchContainer.#ESCAPE_KEY) {
            this.search.blur();
        } else {
            return;
        }
        // Открытая карточка слушает документ: Enter сохранил бы её, а Esc закрыл
        e.stopPropagation();
    }


    moveActiveItem(forward) {
        this.setActiveItem(forward
            ? this.activeItem?.nextElementSibling ?? this.searchList.firstElementChild
            : this.activeItem?.previousElementSibling ?? this.searchList.lastElementChild);
    }


    setActiveItem(item) {
        removeClass(this.activeItem, SearchContainer.#ACTIVE_CLASS);
        addClass(item, SearchContainer.#ACTIVE_CLASS);
        this.activeItem = item;
    }


    isFocused() {
        return document.activeElement === this.search;
    }


    onMouseDown(e) {
        if (this.isFocused()) {
            e.preventDefault();
            if (e.button === 0) {
                e.target.click();
            }
        }
    }


    searchSeries() {
        this.searchList.innerHTML = "";
        this.activeItem = null;
        const query = this.search.value.trim().toLowerCase();
        if (query === "") {
            return;
        }
        const found = [];
        for (const container of this.app.containers.values()) {
            for (const series of container.map.values()) {
                const position = series.data.name.toLowerCase().indexOf(query);
                if (position !== -1) {
                    found.push({series, position});
                }
            }
        }
        found.sort((a, b) => a.position - b.position);
        this.searchList.append(...found.slice(0, SearchContainer.#RESULT_COUNT).map(({series}) => this.createItem(series)));
    }


    createItem(series) {
        const item = document.createElement("div");
        item.className = "search-item";
        item.textContent = series.data.name;
        item.onclick = () => this.onSearchItemClick(series);
        item.onmouseover = () => this.setActiveItem(item);
        item.onmouseout = () => this.setActiveItem(null);
        return item;
    }


    onSearchItemClick(series) {
        this.search.value = series.data.name;
        this.app.onSearchItemClick(series.data.id);
    }
}
