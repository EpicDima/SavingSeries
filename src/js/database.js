export default class Database {
    static DATABASE_NAME = "SavingSeries";
    static #DB_VERSION = 2;
    static SERIES_META_OBJECT_STORE_NAME = "series_meta";
    static SERIES_IMAGES_OBJECT_STORE_NAME = "series_images";

    static #instance;

    #unavailableReason = {key: "database_not_ready"};

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
        request.onblocked = () => this.#reportUnavailable("database_blocked");
        request.onerror = () => this.#reportUnavailable(request.error.name === "VersionError"
            ? "database_newer_version"
            : "database_error", {error: request.error.message});
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const seriesMetaStore = database.createObjectStore(Database.SERIES_META_OBJECT_STORE_NAME, {keyPath: "id"});
            seriesMetaStore.createIndex("name_idx", "name");
            database.createObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME, {keyPath: "id"});
        };
    }


    #reportUnavailable(key, params) {
        this.#unavailableReason = {key, params};
        alert(window.i18n.t(key, params));
    }


    checkAvailable() {
        if (!this.database) {
            alert(window.i18n.t(this.#unavailableReason.key, this.#unavailableReason.params));
        }
        return !!this.database;
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


    // id берётся в той же транзакции, что и запись: другая вкладка не выдаст такой же
    addSeries(series) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(
                [Database.SERIES_META_OBJECT_STORE_NAME, Database.SERIES_IMAGES_OBJECT_STORE_NAME], "readwrite");
            const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
            const {image, ...meta} = series.data;
            metaStore.openCursor(null, "prev").onsuccess = (event) => {
                meta.id = (event.target.result?.key ?? 0) + 1;
                metaStore.add(meta);
                if (image) {
                    transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).add({id: meta.id, image: image});
                }
            };
            transaction.oncomplete = () => resolve(meta.id);
            transaction.onerror = () => reject(transaction.error);
        });
    }


    deleteSeriesFromDb(series) {
        this.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).delete(series.data.id);
        this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(series.data.id);
    }

    deleteSeriesImage(id) {
        this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(id);
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
        request.onsuccess = () => {
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
        this.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).clear();
        this.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).clear();
    }
}
