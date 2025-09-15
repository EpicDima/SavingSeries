import {addClass, debounce, removeClass} from "./common";


export default class SearchContainer {

    static ACTIVE_CLASS = "active";

    static ARROW_DOWN_KEY = "ArrowDown";
    static ARROW_UP_KEY = "ArrowUp";
    static ENTER_KEY = "Enter";
    static ESCAPE_KEY = "Escape";

    static RESULT_COUNT = 10;


    constructor(app) {
        this.app = app;
        this.generate();
    }


    getFragment() {
        return this.container;
    }


    generate() {
        const template = document.getElementById("searchContainerTemplate");
        this.fragment = template.content.cloneNode(true);

        this.container = this.fragment.querySelector(".search-container");
        this.search = this.fragment.querySelector(".search");
        this.searchList = this.fragment.querySelector(".search-list");
        this.closeButton = this.fragment.querySelector(".close");

        this.setListeners();
        this.clear();
    }


    setListeners() {
        this.search.oninput = debounce(() => this.searchSeries(), 200);
        this.search.onkeydown = (e) => this.cancelDefaultAction(e);
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


    cancelDefaultAction(e) {
        if (e.key === SearchContainer.ARROW_DOWN_KEY || e.key === SearchContainer.ARROW_UP_KEY) {
            e.preventDefault();
        }
    }


    moveByKeyboard(key) {
        if (key === SearchContainer.ARROW_DOWN_KEY || key === SearchContainer.ARROW_UP_KEY) {
            if (this.activeItem) {
                removeClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
                if (key === SearchContainer.ARROW_DOWN_KEY) {
                    if (this.activeItem.nextElementSibling) {
                        this.activeItem = this.activeItem.nextElementSibling;
                    } else {
                        this.activeItem = this.searchList.firstElementChild;
                    }
                } else if (key === SearchContainer.ARROW_UP_KEY) {
                    if (this.activeItem.previousElementSibling) {
                        this.activeItem = this.activeItem.previousElementSibling;
                    } else {
                        this.activeItem = this.searchList.lastElementChild;
                    }
                }
            } else {
                if (key === SearchContainer.ARROW_DOWN_KEY) {
                    this.activeItem = this.searchList.firstElementChild;
                } else if (key === SearchContainer.ARROW_UP_KEY) {
                    this.activeItem = this.searchList.lastElementChild;
                }
            }
            addClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
        } else if (key === SearchContainer.ENTER_KEY) {
            if (this.activeItem) {
                this.activeItem.click();
            }
        } else if (key === SearchContainer.ESCAPE_KEY) {
            if (this.isFocused()) {
                this.search.blur();
            }
        }
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
        let substr = this.search.value.trim().toLowerCase();
        this.searchList.innerHTML = "";
        this.activeItem = null;
        if (substr.length > 0) {
            let indexes = new Map();
            for (let container of this.app.containers.values()) {
                for (let series of container.map.values()) {
                    let index = series.data.name.toLowerCase().search(substr);
                    if (index !== -1) {
                        if (!indexes.has(index)) {
                            indexes.set(index, []);
                        }
                        indexes.get(index).push(series);
                    }
                }
            }
            indexes = new Map([...indexes.entries()].sort());
            let seriesList = [];
            for (let array of indexes.values()) {
                array.forEach(series => seriesList.push(series));
            }
            let size = Math.min(seriesList.length, SearchContainer.RESULT_COUNT);
            let inner = [];
            for (let i = 0; i < size; i++) {
                inner.push(this.createItem(seriesList[i]));
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
        elem.addEventListener("mouseout", () => {
            removeClass(elem, SearchContainer.ACTIVE_CLASS);
            removeClass(this.activeItem, SearchContainer.ACTIVE_CLASS);
            this.activeItem = null;
        });
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
