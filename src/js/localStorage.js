export default class LocalStorage {

    static #CONTAINERS_KEY = "containers";
    static #NAVBAR_KEY = "navbar";


    getCountNumberOfContainer(id) {
        return this.#getContainersParams()[id]?.count ?? null;
    }


    setCountNumberOfContainer(id, count) {
        this.#setContainerParam(id, "count", count);
    }


    getGridStateOfContainer(id) {
        return this.#getContainersParams()[id]?.grid ?? null;
    }


    setGridStateOfContainer(id, grid) {
        this.#setContainerParam(id, "grid", grid);
    }


    getNavBarPosition() {
        return localStorage.getItem(LocalStorage.#NAVBAR_KEY);
    }


    setNavBarPosition(position) {
        localStorage.setItem(LocalStorage.#NAVBAR_KEY, position);
    }


    #getContainersParams() {
        try {
            const params = JSON.parse(localStorage.getItem(LocalStorage.#CONTAINERS_KEY));
            return isObject(params) ? params : {};
        } catch (e) {
            return {};
        }
    }


    #setContainerParam(id, name, value) {
        const params = this.#getContainersParams();
        params[id] = {...(isObject(params[id]) ? params[id] : {}), [name]: value};
        localStorage.setItem(LocalStorage.#CONTAINERS_KEY, JSON.stringify(params));
    }
}


function isObject(value) {
    return typeof value === "object" && value !== null;
}
