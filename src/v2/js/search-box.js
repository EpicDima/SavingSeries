export default class SearchBox {
    constructor(containers) {
        this.containers = containers;

        this.search = document.querySelector(".search");
        this.searchList = document.querySelector(".search-list");

        this.search.value = "";
        this.search.oninput = () => this.searchSeries();
        this.searchList.onmousedown = (e) => this.onMouseDown(e);
    }

    onMouseDown(e) {
        if (document.activeElement === this.search) {
            e.preventDefault();
            e.target.click();
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
                        inner += `<div class="search-item" onclick="onSearchItemClick(${series.data.id})">${series.data.name}</div>`;
                    }
                }
            }
            this.searchList.innerHTML = inner;
        }
    }
}