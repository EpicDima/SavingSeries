import {addClass, parseHtml, removeClass} from "./common";


export default class SearchContainer {

    static ACTIVE_CLASS = "active";

    static ARROW_DOWN_KEY = "ArrowDown";
    static ARROW_UP_KEY = "ArrowUp";
    static ENTER_KEY = "Enter";


    constructor(app) {
        this.app = app;

        this.generate();
    }


    getFragment() {
        return this.container;
    }


    generate() {
        this.fragment = parseHtml(this.createHtml());

        this.container = this.fragment.querySelector(".search-container");
        this.search = this.fragment.querySelector(".search");
        this.searchList = this.fragment.querySelector(".search-list");
        this.closeButton = this.fragment.querySelector(".close");

        this.setListeners();
        this.clear();
    }


    createHtml() {
        return `<div class="nav-item search-container">
            <input class="search" maxlength="100" placeholder="Поиск" aria-label="Поиск">
            <span class="close">&#10006;</span>
            <div class="search-list"></div>
        </div>`;
    }


    setListeners() {
        this.search.oninput = () => this.searchSeries();
        this.search.onkeyup = (e) => this.moveByKeyboard(e.key);
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


    moveByKeyboard(key) {
        if (key === SearchContainer.ARROW_DOWN_KEY || key === SearchContainer.ARROW_UP_KEY) {
            if (this.activeItem) {
                removeClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
                if (key === SearchContainer.ARROW_DOWN_KEY && this.activeItem.nextElementSibling) {
                    this.activeItem = this.activeItem.nextElementSibling;
                } else if (key === SearchContainer.ARROW_UP_KEY && this.activeItem.previousElementSibling) {
                    this.activeItem = this.activeItem.previousElementSibling;
                }
            } else {
                if (key === SearchContainer.ARROW_DOWN_KEY) {
                    this.activeItem = this.searchList.firstElementChild;
                } else if (key === SearchContainer.ARROW_UP_KEY) {
                    this.activeItem = this.searchList.lastElementChild;
                }
            }
            addClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
            if (this.activeItem) {
                this.activeItem.scrollIntoView({block: "nearest"});
            }
        } else if (key === SearchContainer.ENTER_KEY) {
            if (this.activeItem) {
                this.activeItem.click();
            }
        }
    }


    onMouseDown(e) {
        if (document.activeElement === this.search) {
            e.preventDefault();
            if (e.button === 0) {
                e.target.click();
            }
        }
    }


    searchSeries() {
        let substr = this.search.value.trim().toLowerCase();
        this.searchList.innerHTML = "";
        this.activeItem = null;
        if (substr.length > 0) {
            let inner = [];
            for (let container of this.app.containers.values()) {
                for (let series of container.map.values()) {
                    if (series.data.name.toLowerCase().search(substr) !== -1) {
                        inner.push(this.createItem(series));
                    }
                }
            }
            this.searchList.append(...inner);
        }
    }


    setMouseOverAndOutListener(elem) {
        elem.addEventListener("mouseover", () => {
            removeClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
            addClass(elem, SearchContainer.ACTIVE_CLASS);
            this.activeItem = elem;
        });
        elem.addEventListener("mouseout", () => removeClass(elem, SearchContainer.ACTIVE_CLASS));
    }


    createItem(series) {
        let item = document.createElement("div");
        item.className = "search-item";
        item.onclick = () => this.onSearchItemClick(series.data.id);
        item.innerText = series.data.name;
        this.setMouseOverAndOutListener(item);
        return item;
    }


    onSearchItemClick(id) {
        this.search.value = this.activeItem.innerText;
        this.app.onSearchItemClick(id);
        this.searchList.innerHTML = "";
        this.searchList.append(this.activeItem);
    }
}
