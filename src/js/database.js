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


    // Картинка тяжёлая, поэтому пишется, только когда сменилась
    putSeriesInDb(series, imageChanged = false) {
        return this.#write((metaStore, imagesStore) => {
            const {image, ...meta} = series.data;
            metaStore.put(meta);
            if (imageChanged && image) {
                imagesStore.put({id: meta.id, image: image});
            }
        });
    }


    // id берётся в той же транзакции, что и запись: другая вкладка не выдаст такой же
    async addSeries(series) {
        const {image, ...meta} = series.data;
        const saved = await this.#write((metaStore, imagesStore) => {
            metaStore.openCursor(null, "prev").onsuccess = (event) => {
                meta.id = (event.target.result?.key ?? 0) + 1;
                metaStore.add(meta);
                if (image) {
                    imagesStore.add({id: meta.id, image: image});
                }
            };
        });
        return saved ? meta.id : null;
    }


    deleteSeriesFromDb(series) {
        return this.#write((metaStore, imagesStore) => {
            metaStore.delete(series.data.id);
            imagesStore.delete(series.data.id);
        });
    }


    // Запись не прошла — сообщаем сразу: иначе правка видна, но после перезагрузки пропадёт
    #write(work) {
        if (!this.checkAvailable()) {
            return Promise.resolve(false);
        }
        return new Promise((resolve) => {
            const fail = (error) => {
                alert(window.i18n.t("save_failed", {error: error?.message ?? error}));
                resolve(false);
            };
            let transaction;
            try {
                transaction = this.database.transaction(
                    [Database.SERIES_META_OBJECT_STORE_NAME, Database.SERIES_IMAGES_OBJECT_STORE_NAME], "readwrite");
                transaction.oncomplete = () => resolve(true);
                transaction.onabort = () => fail(transaction.error);
                work(transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME),
                    transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME));
            } catch (error) {
                if (transaction) {
                    transaction.onabort = null;
                    transaction.abort();
                }
                fail(error);
            }
        });
    }


    // Записи и картинки читаются в одной транзакции: другая вкладка не вклинится между ними
    getAllSeries() {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(
                [Database.SERIES_META_OBJECT_STORE_NAME, Database.SERIES_IMAGES_OBJECT_STORE_NAME], "readonly");
            const metaRequest = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).getAll();
            const imagesRequest = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).getAll();
            transaction.oncomplete = () => {
                const images = new Map(imagesRequest.result.map(({id, image}) => [id, image]));
                resolve(metaRequest.result.map(meta => ({...meta, image: images.get(meta.id)})));
            };
            transaction.onabort = () => reject(transaction.error);
        });
    }


    // Очистка и запись в одной транзакции: при любой ошибке остаются прежние данные
    replaceAllSeries(records) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(
                [Database.SERIES_META_OBJECT_STORE_NAME, Database.SERIES_IMAGES_OBJECT_STORE_NAME], "readwrite");
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            try {
                const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
                const imagesStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
                metaStore.clear();
                imagesStore.clear();
                for (const {image, ...meta} of records) {
                    metaStore.add(meta);
                    if (image) {
                        imagesStore.add({id: meta.id, image: image});
                    }
                }
            } catch (error) {
                reject(error);
                transaction.abort();
            }
        });
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
}
