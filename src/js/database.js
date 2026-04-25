export default class Database {
    static DATABASE_NAME = "SavingSeries";
    static #DB_VERSION = 3;
    static #SERIES_OBJECT_STORE_NAME = "series";
    static SERIES_META_OBJECT_STORE_NAME = "series_meta";
    static SERIES_IMAGES_OBJECT_STORE_NAME = "series_images";
    static SYNC_STATE_OBJECT_STORE_NAME = "sync_state";
    static SYNC_DELETED_OBJECT_STORE_NAME = "sync_deleted";

    static #DEVICE_ID_KEY = "deviceId";
    static #DEVICE_ID_LOCAL_STORAGE_KEY = "savingSeries.deviceId";
    static GOOGLE_DRIVE_SYNC_STATE_KEY = "googleDrive";

    static #instance;

    constructor() {
        this.deviceId = null;
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
        request.onupgradeneeded = (event) => {
            this.database = event.target.result;
            const transaction = event.target.transaction;
            const now = Date.now();
            const deviceId = this.#getOrCreateUpgradeDeviceId();
            let seriesMetaStore;
            let seriesImagesStore;

            if (event.oldVersion === 0) {
                seriesMetaStore = this.database.createObjectStore(Database.SERIES_META_OBJECT_STORE_NAME, {keyPath: "id"});
                seriesMetaStore.createIndex("name_idx", "name");
                seriesImagesStore = this.database.createObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME, {keyPath: "id"});
            } else if (event.oldVersion === 1) {
                const objectStore = transaction.objectStore(Database.#SERIES_OBJECT_STORE_NAME);
                seriesMetaStore = this.database.createObjectStore(Database.SERIES_META_OBJECT_STORE_NAME, {keyPath: "id"});
                seriesMetaStore.createIndex("name_idx", "name");
                seriesImagesStore = this.database.createObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME, {keyPath: "id"});

                objectStore.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const {image, ...meta} = cursor.value;
                        seriesMetaStore.add(Database.#withMigratedSyncMetadata(meta, now, deviceId, Boolean(image)));
                        if (image) {
                            seriesImagesStore.add({id: meta.id, image: image});
                        }
                        cursor.continue();
                    } else {
                        this.database.deleteObjectStore(Database.#SERIES_OBJECT_STORE_NAME);
                    }
                };
            }

            if (event.oldVersion < 3) {
                const syncStateStoreCreated = !this.database.objectStoreNames.contains(Database.SYNC_STATE_OBJECT_STORE_NAME);
                if (!this.database.objectStoreNames.contains(Database.SYNC_STATE_OBJECT_STORE_NAME)) {
                    this.database.createObjectStore(Database.SYNC_STATE_OBJECT_STORE_NAME, {keyPath: "key"});
                }
                if (!this.database.objectStoreNames.contains(Database.SYNC_DELETED_OBJECT_STORE_NAME)) {
                    this.database.createObjectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME, {keyPath: "syncId"});
                }
                transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME)
                    .put({key: Database.#DEVICE_ID_KEY, value: deviceId});
                if (syncStateStoreCreated) {
                    transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME)
                        .put(Database.#createDefaultGoogleDriveSyncState());
                }

                if (event.oldVersion === 2) {
                    const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
                    const imagesStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
                    metaStore.openCursor().onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const imageRequest = imagesStore.get(cursor.value.id);
                            imageRequest.onsuccess = () => {
                                cursor.update(Database.#withMigratedSyncMetadata(cursor.value, now, deviceId,
                                    Boolean(imageRequest.result?.image)));
                                cursor.continue();
                            };
                        }
                    };
                }
            }
        };
    }


    static #generateUuid() {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
    }


    #getOrCreateUpgradeDeviceId() {
        let deviceId = localStorage.getItem(Database.#DEVICE_ID_LOCAL_STORAGE_KEY) || Database.#generateUuid();
        this.deviceId = deviceId;
        return deviceId;
    }


    static #withMigratedSyncMetadata(meta, now, deviceId, hasImage) {
        const updatedAt = meta.updatedAt || now;
        return {
            ...meta,
            syncId: meta.syncId || Database.#generateUuid(),
            updatedAt: updatedAt,
            deletedAt: meta.deletedAt || null,
            imageUpdatedAt: meta.imageUpdatedAt || (hasImage ? updatedAt : null),
            deviceId: meta.deviceId || deviceId,
            rev: meta.rev || 1
        };
    }


    static #createDefaultGoogleDriveSyncState() {
        return {
            key: Database.GOOGLE_DRIVE_SYNC_STATE_KEY,
            signedIn: false,
            lastSyncAt: null,
            lastPullAt: null,
            lastPushAt: null,
            lastError: null,
            status: "idle"
        };
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


    createSyncId() {
        return Database.#generateUuid();
    }


    getDeviceId() {
        if (this.deviceId) {
            return Promise.resolve(this.deviceId);
        }
        return new Promise((resolve) => {
            const fallback = () => {
                this.deviceId = localStorage.getItem(Database.#DEVICE_ID_LOCAL_STORAGE_KEY) || Database.#generateUuid();
                localStorage.setItem(Database.#DEVICE_ID_LOCAL_STORAGE_KEY, this.deviceId);
                resolve(this.deviceId);
            };

            const request = this.getReadOnlyObjectStore(Database.SYNC_STATE_OBJECT_STORE_NAME).get(Database.#DEVICE_ID_KEY);
            request.onsuccess = () => {
                const deviceId = request.result?.value;
                if (deviceId) {
                    this.deviceId = deviceId;
                    resolve(deviceId);
                    return;
                }
                this.deviceId = localStorage.getItem(Database.#DEVICE_ID_LOCAL_STORAGE_KEY) || Database.#generateUuid();
                localStorage.setItem(Database.#DEVICE_ID_LOCAL_STORAGE_KEY, this.deviceId);
                this.getReadWriteObjectStore(Database.SYNC_STATE_OBJECT_STORE_NAME)
                    .put({key: Database.#DEVICE_ID_KEY, value: this.deviceId});
                resolve(this.deviceId);
            };
            request.onerror = fallback;
        });
    }


    #getByKey(storeName, key) {
        return new Promise((resolve, reject) => {
            const request = this.getReadOnlyObjectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }


    #waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async putSeriesInDb(series) {
        const {image, ...meta} = series.data;
        const now = Date.now();
        const deviceId = await this.getDeviceId();
        const previousMeta = await this.#getByKey(Database.SERIES_META_OBJECT_STORE_NAME, meta.id);
        const previousImage = await this.getSeriesImage(meta.id);
        const sameDate = (left, right) => {
            if (left instanceof Date && right instanceof Date) {
                return left.getTime() === right.getTime();
            }
            return left === right;
        };
        const metaChanged = !previousMeta
            || previousMeta.name !== meta.name
            || previousMeta.season !== meta.season
            || previousMeta.episode !== meta.episode
            || !sameDate(previousMeta.date, meta.date)
            || previousMeta.site !== meta.site
            || previousMeta.note !== meta.note
            || previousMeta.status !== meta.status;
        const imageChanged = Boolean(image) && image !== (previousImage || "");
        const hasSyncMetadata = meta.syncId && meta.updatedAt && meta.deviceId && meta.rev;
        const shouldBump = metaChanged || imageChanged || !hasSyncMetadata;

        meta.syncId = meta.syncId || previousMeta?.syncId || Database.#generateUuid();
        meta.updatedAt = shouldBump ? now : (meta.updatedAt || previousMeta?.updatedAt || now);
        meta.deletedAt = null;
        meta.imageUpdatedAt = imageChanged ? now : (meta.imageUpdatedAt || previousMeta?.imageUpdatedAt || null);
        meta.deviceId = shouldBump ? deviceId : (meta.deviceId || previousMeta?.deviceId || deviceId);
        meta.rev = shouldBump ? (previousMeta?.rev || meta.rev || 0) + 1 : (meta.rev || previousMeta?.rev || 1);

        Object.assign(series.data, meta);

        const transaction = this.database.transaction([
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME
        ], "readwrite");
        transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).put(meta);
        if (image) {
            transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).put({id: meta.id, image: image});
        }
        await this.#waitForTransaction(transaction);
    }


    async getGoogleDriveSyncState() {
        const state = await this.#getByKey(Database.SYNC_STATE_OBJECT_STORE_NAME, Database.GOOGLE_DRIVE_SYNC_STATE_KEY);
        return state || Database.#createDefaultGoogleDriveSyncState();
    }


    async updateGoogleDriveSyncState(patch) {
        const previous = await this.getGoogleDriveSyncState();
        const next = {
            ...previous,
            ...patch,
            key: Database.GOOGLE_DRIVE_SYNC_STATE_KEY
        };
        return new Promise((resolve, reject) => {
            const request = this.getReadWriteObjectStore(Database.SYNC_STATE_OBJECT_STORE_NAME).put(next);
            request.onsuccess = () => resolve(next);
            request.onerror = () => reject(request.error);
        });
    }


    async deleteSeriesFromDb(series) {
        const previousMeta = await this.#getByKey(Database.SERIES_META_OBJECT_STORE_NAME, series.data.id);
        const syncId = series.data.syncId || previousMeta?.syncId || Database.#generateUuid();
        const deviceId = await this.getDeviceId();
        const transaction = this.database.transaction([
            Database.SYNC_DELETED_OBJECT_STORE_NAME,
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME
        ], "readwrite");
        transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME).put({
            syncId: syncId,
            deletedAt: Date.now(),
            deviceId: deviceId
        });
        transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).delete(series.data.id);
        transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(series.data.id);
        await this.#waitForTransaction(transaction);
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
        this.getReadWriteObjectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME).clear();
    }
}
