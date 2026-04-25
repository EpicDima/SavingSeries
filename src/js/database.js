export default class Database {
    static DATABASE_NAME = "SavingSeries";
    static #DB_VERSION = 3;
    static #SERIES_OBJECT_STORE_NAME = "series";
    static SERIES_META_OBJECT_STORE_NAME = "series_meta";
    static SERIES_IMAGES_OBJECT_STORE_NAME = "series_images";
    static SYNC_STATE_OBJECT_STORE_NAME = "sync_state";
    static SYNC_DELETED_OBJECT_STORE_NAME = "sync_deleted";

    static #DEVICE_ID_KEY = "deviceId";
    static LOCAL_GENERATION_KEY = "localGeneration";
    static #SYNC_LOCK_KEY = "syncLock";
    static #DEVICE_ID_LOCAL_STORAGE_KEY = "savingSeries.deviceId";
    static GOOGLE_DRIVE_SYNC_STATE_KEY = "googleDrive";

    static #instance;

    constructor() {
        this.deviceId = null;
        this.instanceId = Database.#generateUuid();
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
                transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME)
                    .put({key: Database.LOCAL_GENERATION_KEY, value: 0});
                transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME)
                    .put({key: Database.#SYNC_LOCK_KEY, value: null});
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
            dirty: false,
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


    async prepareImportedSeries(series) {
        const deviceId = await this.getDeviceId();
        return Database.#withMigratedSyncMetadata(series, series.updatedAt || Date.now(), deviceId, Boolean(series.image));
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
        const normalizedImage = image || "";
        const normalizedPreviousImage = previousImage || "";
        const imageChanged = normalizedImage !== normalizedPreviousImage;
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
            Database.SERIES_IMAGES_OBJECT_STORE_NAME,
            Database.SYNC_STATE_OBJECT_STORE_NAME
        ], "readwrite");
        transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).put(meta);
        if (normalizedImage) {
            transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).put({id: meta.id, image: normalizedImage});
        } else if (previousImage) {
            transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(meta.id);
        }
        this.#markGoogleDriveSyncDirtyInTransaction(transaction);
        await this.#waitForTransaction(transaction);
        window.dispatchEvent(new CustomEvent("savingseries:local-sync-dirty"));
    }


    async getGoogleDriveSyncState() {
        const state = await this.#getByKey(Database.SYNC_STATE_OBJECT_STORE_NAME, Database.GOOGLE_DRIVE_SYNC_STATE_KEY);
        return state || Database.#createDefaultGoogleDriveSyncState();
    }


    async updateGoogleDriveSyncState(patch) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            let next;
            const request = store.get(Database.GOOGLE_DRIVE_SYNC_STATE_KEY);
            request.onsuccess = () => {
                next = {
                    ...(request.result || Database.#createDefaultGoogleDriveSyncState()),
                    ...patch,
                    key: Database.GOOGLE_DRIVE_SYNC_STATE_KEY
                };
                store.put(next);
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve(next);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async getLocalGeneration() {
        const generation = await this.#getByKey(Database.SYNC_STATE_OBJECT_STORE_NAME, Database.LOCAL_GENERATION_KEY);
        return Number(generation?.value || 0);
    }


    async updateGoogleDriveSyncStateIfGeneration(expectedGeneration, cleanPatch, dirtyPatch) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            let next;

            const generationRequest = store.get(Database.LOCAL_GENERATION_KEY);
            generationRequest.onsuccess = () => {
                const currentGeneration = Number(generationRequest.result?.value || 0);
                const stateRequest = store.get(Database.GOOGLE_DRIVE_SYNC_STATE_KEY);
                stateRequest.onsuccess = () => {
                    const previous = stateRequest.result || Database.#createDefaultGoogleDriveSyncState();
                    next = {
                        ...previous,
                        ...(currentGeneration === expectedGeneration ? cleanPatch : dirtyPatch),
                        key: Database.GOOGLE_DRIVE_SYNC_STATE_KEY
                    };
                    store.put(next);
                };
                stateRequest.onerror = () => reject(stateRequest.error);
            };
            generationRequest.onerror = () => reject(generationRequest.error);
            transaction.oncomplete = () => resolve(next);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async acquireSyncLock(ttlMs = 60000) {
        const now = Date.now();
        const lock = {
            owner: this.instanceId,
            token: Database.#generateUuid(),
            expiresAt: now + ttlMs
        };
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            const request = store.get(Database.#SYNC_LOCK_KEY);
            let acquired = false;

            request.onsuccess = () => {
                const current = request.result?.value;
                if (current?.owner && current.owner !== this.instanceId && Number(current.expiresAt || 0) > now) {
                    return;
                }
                store.put({key: Database.#SYNC_LOCK_KEY, value: lock});
                acquired = true;
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve(acquired ? lock : null);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async renewSyncLock(lock, ttlMs = 60000) {
        if (!lock) {
            return false;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            const request = store.get(Database.#SYNC_LOCK_KEY);
            let renewed = false;

            request.onsuccess = () => {
                const current = request.result?.value;
                if (Database.#isSameSyncLock(current, lock)) {
                    const nextLock = {
                        owner: lock.owner,
                        token: lock.token,
                        expiresAt: Date.now() + ttlMs
                    };
                    lock.expiresAt = nextLock.expiresAt;
                    store.put({key: Database.#SYNC_LOCK_KEY, value: nextLock});
                    renewed = true;
                }
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve(renewed);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async validateSyncLock(lock) {
        if (!lock) {
            return false;
        }
        const current = (await this.#getByKey(Database.SYNC_STATE_OBJECT_STORE_NAME, Database.#SYNC_LOCK_KEY))?.value;
        return Database.#isSameSyncLock(current, lock) && Number(current.expiresAt || 0) > Date.now();
    }


    async releaseSyncLock(lock) {
        if (!lock) {
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            const request = store.get(Database.#SYNC_LOCK_KEY);
            request.onsuccess = () => {
                const current = request.result?.value;
                if (Database.#isSameSyncLock(current, lock)) {
                    store.put({key: Database.#SYNC_LOCK_KEY, value: null});
                }
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }


    async deleteSeriesFromDb(series) {
        const previousMeta = await this.#getByKey(Database.SERIES_META_OBJECT_STORE_NAME, series.data.id);
        const syncId = series.data.syncId || previousMeta?.syncId || Database.#generateUuid();
        const deviceId = await this.getDeviceId();
        const transaction = this.database.transaction([
            Database.SYNC_DELETED_OBJECT_STORE_NAME,
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME,
            Database.SYNC_STATE_OBJECT_STORE_NAME
        ], "readwrite");
        transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME).put({
            syncId: syncId,
            deletedAt: Date.now(),
            deviceId: deviceId
        });
        transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).delete(series.data.id);
        transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).delete(series.data.id);
        this.#markGoogleDriveSyncDirtyInTransaction(transaction);
        await this.#waitForTransaction(transaction);
        window.dispatchEvent(new CustomEvent("savingseries:local-sync-dirty"));
    }


    async #markGoogleDriveSyncDirty() {
        const transaction = this.database.transaction(Database.SYNC_STATE_OBJECT_STORE_NAME, "readwrite");
        this.#markGoogleDriveSyncDirtyInTransaction(transaction);
        await this.#waitForTransaction(transaction);
        window.dispatchEvent(new CustomEvent("savingseries:local-sync-dirty"));
    }


    #markGoogleDriveSyncDirtyInTransaction(transaction) {
        const status = navigator.onLine ? "pending" : "offline";
        const store = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
        const generationRequest = store.get(Database.LOCAL_GENERATION_KEY);
        generationRequest.onsuccess = () => {
            store.put({key: Database.LOCAL_GENERATION_KEY, value: Number(generationRequest.result?.value || 0) + 1});
        };
        const stateRequest = store.get(Database.GOOGLE_DRIVE_SYNC_STATE_KEY);
        stateRequest.onsuccess = () => {
            store.put({
                ...(stateRequest.result || Database.#createDefaultGoogleDriveSyncState()),
                key: Database.GOOGLE_DRIVE_SYNC_STATE_KEY,
                dirty: true,
                status: status,
                lastError: null
            });
        };
    }


    markGoogleDriveSyncDirtyInTransaction(transaction) {
        this.#markGoogleDriveSyncDirtyInTransaction(transaction);
    }


    static #isSameSyncLock(current, lock) {
        return current?.owner === lock?.owner && current?.token === lock?.token;
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


    async getSeriesMetaBySyncId(syncId) {
        return new Promise((resolve, reject) => {
            const request = this.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) {
                    resolve(null);
                    return;
                }
                if (cursor.value.syncId === syncId) {
                    resolve(cursor.value);
                    return;
                }
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    }


    async getSeriesImageBySyncId(syncId) {
        const meta = await this.getSeriesMetaBySyncId(syncId);
        return meta ? this.getSeriesImage(meta.id) : null;
    }


    async getSeriesImageInfoBySyncId() {
        const [series, images] = await Promise.all([
            this.#getAllFromStore(Database.SERIES_META_OBJECT_STORE_NAME),
            this.#getAllFromStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME)
        ]);
        const imageById = new Map(images.map(item => [item.id, item.image]));
        const result = new Map();
        for (const meta of series) {
            if (meta.syncId) {
                result.set(meta.syncId, {
                    image: imageById.get(meta.id) || null,
                    hasImage: Boolean(imageById.get(meta.id)),
                    imageUpdatedAt: meta.imageUpdatedAt || null
                });
            }
        }
        return result;
    }


    #getAllFromStore(storeName) {
        return new Promise((resolve, reject) => {
            const request = this.getReadOnlyObjectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }


    async putSeriesImageBySyncIdIfCurrent(syncId, image, imageUpdatedAt) {
        return this.#updateSeriesImageBySyncIdIfCurrent(syncId, image, imageUpdatedAt);
    }


    async deleteSeriesImageBySyncIdIfCurrent(syncId, imageUpdatedAt) {
        return this.#updateSeriesImageBySyncIdIfCurrent(syncId, null, imageUpdatedAt);
    }


    async #updateSeriesImageBySyncIdIfCurrent(syncId, image, imageUpdatedAt) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([
                Database.SERIES_META_OBJECT_STORE_NAME,
                Database.SERIES_IMAGES_OBJECT_STORE_NAME
            ], "readwrite");
            const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
            const imagesStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
            const request = metaStore.openCursor();
            let updated = false;

            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) {
                    return;
                }
                const meta = cursor.value;
                if (meta.syncId !== syncId) {
                    cursor.continue();
                    return;
                }
                if (Number(meta.imageUpdatedAt || 0) !== Number(imageUpdatedAt || 0)) {
                    return;
                }
                if (image) {
                    imagesStore.put({id: meta.id, image: image});
                } else {
                    imagesStore.delete(meta.id);
                }
                updated = true;
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve(updated);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
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


    async markGoogleDriveSyncDirty() {
        await this.#markGoogleDriveSyncDirty();
    }


    async clear() {
        const transaction = this.database.transaction([
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME,
            Database.SYNC_DELETED_OBJECT_STORE_NAME
        ], "readwrite");
        transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME).clear();
        transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).clear();
        transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME).clear();
        await this.#waitForTransaction(transaction);
    }
}
