import {getByQuery} from "./common";
import AlertDialog from "./alertDialog";

export default class Database {
    static DATABASE_NAME = "SavingSeries";
    static #DB_VERSION = 2;
    static #SERIES_OBJECT_STORE_NAME = "series";
    static SERIES_META_OBJECT_STORE_NAME = "series_meta";
    static SERIES_IMAGES_OBJECT_STORE_NAME = "series_images";

    static #instance;

    constructor() {
    }

    static getInstance() {
        if (!Database.#instance) {
            Database.#instance = new Database();
        }
        return Database.#instance;
    }


    connect(func) {
        let request = indexedDB.open(Database.DATABASE_NAME, Database.#DB_VERSION);
        request.onsuccess = () => {
            this.database = request.result;
            func();
        };
        request.onupgradeneeded = async (event) => {
            this.database = event.target.result;
            if (event.oldVersion < 2) {
                const objectStore = event.target.transaction.objectStore(Database.#SERIES_OBJECT_STORE_NAME);
                const seriesMetaStore = this.database.createObjectStore(Database.SERIES_META_OBJECT_STORE_NAME, {keyPath: "id"});
                seriesMetaStore.createIndex("name_idx", "name");
                const seriesImagesStore = this.database.createObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME, {keyPath: "id"});

                objectStore.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const {image, ...meta} = cursor.value;
                        seriesMetaStore.add(meta);
                        seriesImagesStore.add({id: meta.id, image: image});
                        cursor.continue();
                    } else {
                        this.database.deleteObjectStore(Database.#SERIES_OBJECT_STORE_NAME);
                    }
                };
            } else {
                const deleteDbOnClose = () => indexedDB.deleteDatabase(Database.DATABASE_NAME);
                window.addEventListener("pagehide", deleteDbOnClose);
                this.database.createObjectStore(Database.SERIES_META_OBJECT_STORE_NAME, {keyPath: "id"});
                this.database.createObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME, {keyPath: "id"});

                let dialog = new AlertDialog(window.i18n.t("database_store_on_computer"));
                let result = await dialog.open();
                if (result) {
                    window.removeEventListener("pagehide", deleteDbOnClose);
                    this.connect(func);
                } else {
                    window.removeEventListener("pagehide", deleteDbOnClose);
                    indexedDB.deleteDatabase(Database.DATABASE_NAME);
                    alert(window.i18n.t("database_no_access"));
                    getByQuery("body").style.display = "none";
                }
            }
        }
    }


    getObjectStore(name, mode) {
        return this.database
            .transaction(name, mode)
            .objectStore(name);
    }


    getReadWriteObjectStore(name) {
        return this.getObjectStore(name, "readwrite");
    }


    getReadOnlyObjectStore(name) {
        return this.getObjectStore(name, "readonly");
    }


    async putSeriesInDb(series) {
        const {image, ...meta} = series.data;
        this.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).put(meta);
        if (image) {
            this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).put({id: meta.id, image: image});
        }
    }


    deleteSeriesFromDb(series) {
        this.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).delete(series.data.id);
        this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(series.data.id);
    }

    getSeriesImage(id) {
        return new Promise((resolve, reject) => {
            const request = this.getReadOnlyObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).get(id);
            request.onsuccess = (event) => {
                resolve(event.target.result?.image);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    foreach(func, funcOnEnd = null) {
        let request = this.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).openCursor();
        let id = 0;
        request.onsuccess = () => {
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
        this.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).clear();
        this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).clear();
    }
}
