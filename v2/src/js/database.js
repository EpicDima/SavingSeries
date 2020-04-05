import {getByQuery} from "./common";
import Dialog from "./dialog";

export default class Database {
    static DATABASE_NAME = "SavingSeries";
    static OBJECT_STORE_NAME = "series";

    static #instance;

    constructor() {}

    static getInstance() {
        if (!Database.#instance) {
            Database.#instance = new Database();
        }
        return Database.#instance;
    }


    connect(func) {
        let request = indexedDB.open(Database.DATABASE_NAME, 1);
        request.onsuccess = () => {
            this.database = request.result;
            func();
        };
        request.onupgradeneeded = async () => {
            window.onunload = () => indexedDB.deleteDatabase(Database.DATABASE_NAME);
            request.result.createObjectStore(Database.OBJECT_STORE_NAME, {keyPath: "id"});

            let dialog = new Dialog("Данные будут храниться на вашем компьютере");
            let result = await dialog.open();
            if (result) {
                window.onunload = null;
                this.connect(func);
            } else {
                indexedDB.deleteDatabase(Database.DATABASE_NAME);
                getByQuery("html").remove();
            }
        }
    }


    getObjectStore(mode) {
        return this.database
            .transaction(Database.OBJECT_STORE_NAME, mode)
            .objectStore(Database.OBJECT_STORE_NAME);
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


    deleteSeriesFromDb(series) {
        return this.getReadWriteObjectStore().delete(series.data.id)
    }


    foreach(func, funcOnEnd = undefined) {
        let request = this.getReadOnlyObjectStore().openCursor();
        let id = 0;
        request.onsuccess = function () {
            let cursor = request.result;
            if (cursor) {
                func(cursor.value);
                id = cursor.value.id;
                cursor.continue();
            } else if (funcOnEnd) {
                funcOnEnd(id);
            }
        }
    }


    clear() {
        this.getReadWriteObjectStore().clear();
    }
}
