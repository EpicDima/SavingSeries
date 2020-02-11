import {DATABASE_NAME, OBJECT_STORE_NAME} from "./constants";


export default class Database {

    constructor() {
        const instance = this.constructor.instance;
        if (instance) {
            return instance;
        }
        this.constructor.instance = this;
    }

    connect(func) {
        let request = indexedDB.open(DATABASE_NAME, 1);
        request.onerror = error => {
            console.log("connectDB error: " + error);
        };
        request.onsuccess = () => {
            this.database = request.result;
            func();
        };
        request.onupgradeneeded = event => {
            if (confirm("Данные будут храниться на вашем компьютере.\nВы согласны?")) {
                event.currentTarget.result.createObjectStore(OBJECT_STORE_NAME, {keyPath: "id"});
                this.connect(func);
            } else {
                indexedDB.deleteDatabase(DATABASE_NAME);
                document.getElementsByTagName("html")[0].remove();
            }
        }
    }

    getObjectStore(mode) {
        return this.database
            .transaction(OBJECT_STORE_NAME, mode)
            .objectStore(OBJECT_STORE_NAME);
    }

    getReadWriteObjectStore() {
        return this.getObjectStore("readwrite");
    }

    getReadOnlyObjectStore() {
        return this.getObjectStore("readonly");
    }

    putSeriesInDb(series) {
        return this.getReadWriteObjectStore().put(series.data);
    }

    deleteSeriesInDb(series) {
        return this.getReadWriteObjectStore().delete(series.data.id)
    }

    foreach(func, funcOnEnd = undefined) {
        let request = this.getReadOnlyObjectStore().openCursor();
        request.onsuccess = function () {
            let cursor = request.result;
            if (cursor) {
                func(cursor.value);
                cursor.continue();
            } else if (funcOnEnd) {
                funcOnEnd();
            }
        }
    }

    clear() {
        this.getReadWriteObjectStore().clear();
    }
}