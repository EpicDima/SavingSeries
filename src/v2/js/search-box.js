export default class SearchBox {
    constructor(containers) {
        this.containers = containers;

        this.search = document.querySelector(".search-container > .search");
        this.searchList = document.querySelector(".search-container > .search-list");
        this.closeButton = document.querySelector(".search-container > .close");

        this.clearSearch();
        this.search.oninput = () => this.searchSeries();
        this.search.onkeyup = (e) => this.moveByKeyboard(e.key);
        this.searchList.onmousedown = (e) => this.onMouseDown(e);
        this.closeButton.onmousedown = (e) => e.preventDefault();
        this.closeButton.onclick = () => {
            this.clearSearch();
            this.search.focus();
        };

        this.value = "";
    }

    clearSearch() {
        this.search.value = "";
        this.searchList.innerHTML = "";
    }

    moveByKeyboard(key) {
        if (key === "ArrowDown") {
            let active = document.querySelector(".search-list > .search-item.active");
            if (active) {
                if (active.nextElementSibling) {
                    active.nextElementSibling.classList.add("active");
                    active.classList.remove("active");
                }
            } else {
                if (this.searchList.firstElementChild) {
                    this.searchList.firstElementChild.classList.add("active");
                }
            }
        } else if (key === "ArrowUp") {
            let active = document.querySelector(".search-list > .search-item.active");
            if (active) {
                if (active.previousElementSibling) {
                    active.previousElementSibling.classList.add("active");
                    active.classList.remove("active");
                }
            } else {
                if (this.searchList.lastElementChild) {
                    this.searchList.lastElementChild.classList.add("active");
                }
            }
        } else if (key === "Enter") {
            let active = document.querySelector(".search-list > .search-item.active");
            if (active) {
                this.search.value = active.innerText;
                this.searchSeries();
                active.click();
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
        if (substr.length === 0) {
            this.searchList.innerHTML = "";
        } else {
            let inner = "";
            for (let container of this.containers.values()) {
                for (let series of container.map.values()) {
                    if (series.data.name.toLowerCase().search(substr) !== -1) {
                        inner += `<div class="search-item" onclick="onSearchItemClick(${series.data.id})">
                            ${series.data.name}
                        </div>`;
                    }
                }
            }
            this.searchList.innerHTML = inner;
            this.setMouseOverAndOutListeners();
        }
    }

    setMouseOverAndOutListeners() {
        document.querySelectorAll(".search-list > .search-item").forEach(item => {
            item.addEventListener("mouseover", () => {
                let previousActive = document.querySelector(".search-list > .search-item.active");
                if (previousActive) {
                    previousActive.classList.remove("active");
                }
                item.classList.add("active");
            });
            item.addEventListener("mouseout", () => {
                item.classList.remove("active");
            });
        });
    }
}
