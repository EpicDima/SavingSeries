export default class LocalStorage {

    static CONTAINERS_KEY = "containers";
    static NAVBAR_KEY = "navbar";


    clear() {
        localStorage.clear();
    }


    createOrUpdateContainersParams(id) {
        let containersParams;
        try {
            containersParams = JSON.parse(localStorage.getItem(LocalStorage.CONTAINERS_KEY));
        } catch (e) {
        }
        if (!containersParams) {
            containersParams = {};
        }
        if (!containersParams[id]) {
            containersParams[id] = {};
        }
        return containersParams;
    }


    getByKey(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    }


    setByKey(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }


    getCountNumberOfContainer(id) {
        try {
            let containersParams = this.getByKey(LocalStorage.CONTAINERS_KEY);
            return containersParams[id].count;
        } catch (e) {
            return null;
        }
    }


    setCountNumberOfContainer(id, count) {
        let containersParams = this.createOrUpdateContainersParams(id);
        containersParams[id].count = count;
        this.setByKey(LocalStorage.CONTAINERS_KEY, containersParams);
    }


    getGridStateOfContainer(id) {
        try {
            let containersParams = this.getByKey(LocalStorage.CONTAINERS_KEY);
            return containersParams[id].grid;
        } catch (e) {
            return null;
        }
    }


    setGridStateOfContainer(id, grid) {
        let containersParams = this.createOrUpdateContainersParams(id);
        containersParams[id].grid = grid;
        this.setByKey(LocalStorage.CONTAINERS_KEY, containersParams);
    }

    getNavBarPosition() {
        return localStorage.getItem(LocalStorage.NAVBAR_KEY);
    }

    setNavBarPosition(position) {
        localStorage.setItem(LocalStorage.NAVBAR_KEY, position);
    }
}
