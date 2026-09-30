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
        return LocalStorage.#read(LocalStorage.#NAVBAR_KEY);
    }


    setNavBarPosition(position) {
        LocalStorage.#write(LocalStorage.#NAVBAR_KEY, position);
    }


    #getContainersParams() {
        try {
            const params = JSON.parse(LocalStorage.#read(LocalStorage.#CONTAINERS_KEY));
            return isObject(params) ? params : {};
        } catch (e) {
            return {};
        }
    }


    #setContainerParam(id, name, value) {
        const params = this.#getContainersParams();
        params[id] = {...(isObject(params[id]) ? params[id] : {}), [name]: value};
        LocalStorage.#write(LocalStorage.#CONTAINERS_KEY, JSON.stringify(params));
    }


    // Браузер может запретить сайту хранилище: тогда настройки просто не запоминаются
    static #read(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }


    static #write(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
        }
    }
}


function isObject(value) {
    return typeof value === "object" && value !== null;
}
