import Database from "./database";
import Series from "./series";
import LocalStorage from "./localStorage";


export default class SyncRepository {
    static SCHEMA_VERSION = 1;

    constructor(database, localStorage = new LocalStorage()) {
        this.database = database;
        this.localStorage = localStorage;
    }


    async getLocalState() {
        const [series, deleted] = await Promise.all([
            this.#getAll(Database.SERIES_META_OBJECT_STORE_NAME),
            this.#getAll(Database.SYNC_DELETED_OBJECT_STORE_NAME)
        ]);

        return {
            schemaVersion: SyncRepository.SCHEMA_VERSION,
            updatedAt: Date.now(),
            series: series.map(item => this.#serializeSeries(item))
                .filter(Boolean),
            deleted: deleted.map(item => ({
                syncId: item.syncId,
                deletedAt: item.deletedAt,
                deviceId: item.deviceId
            })).filter(item => item.syncId && item.deletedAt),
            settings: this.#getSettings()
        };
    }


    async applyMergedState(state) {
        if (!state || state.schemaVersion !== SyncRepository.SCHEMA_VERSION || !Array.isArray(state.series)) {
            throw new Error("Unsupported sync state format");
        }

        const [existingImages, localDeviceId] = await Promise.all([
            this.#getExistingImagesBySyncId(),
            this.database.getDeviceId()
        ]);

        const transaction = this.database.database.transaction([
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME,
            Database.SYNC_DELETED_OBJECT_STORE_NAME
        ], "readwrite");
        const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
        const imagesStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
        const deletedStore = transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME);

        metaStore.clear();
        imagesStore.clear();
        deletedStore.clear();

        let nextId = 1;
        for (const item of state.series) {
            const series = Series.validate({
                ...item,
                id: nextId,
                deviceId: item.deviceId || localDeviceId
            });
            if (series && series.syncId && !series.deletedAt) {
                const {image, ...meta} = series;
                meta.id = nextId++;
                metaStore.put(meta);

                const existingImage = existingImages.get(meta.syncId);
                if (existingImage) {
                    imagesStore.put({id: meta.id, image: existingImage});
                }
            }
        }

        if (Array.isArray(state.deleted)) {
            for (const item of state.deleted) {
                if (item?.syncId && item.deletedAt) {
                    deletedStore.put({
                        syncId: item.syncId,
                        deletedAt: item.deletedAt,
                        deviceId: item.deviceId || localDeviceId
                    });
                }
            }
        }

        await this.#waitForTransaction(transaction);
        this.#applySettings(state.settings);
    }


    async #getAll(storeName) {
        return new Promise((resolve, reject) => {
            const request = this.database.getReadOnlyObjectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }


    async #getExistingImagesBySyncId() {
        const [series, images] = await Promise.all([
            this.#getAll(Database.SERIES_META_OBJECT_STORE_NAME),
            this.#getAll(Database.SERIES_IMAGES_OBJECT_STORE_NAME)
        ]);
        const syncIdsByLocalId = new Map(series.map(item => [item.id, item.syncId]));
        const imagesBySyncId = new Map();
        for (const image of images) {
            const syncId = syncIdsByLocalId.get(image.id);
            if (syncId && image.image) {
                imagesBySyncId.set(syncId, image.image);
            }
        }
        return imagesBySyncId;
    }


    #serializeSeries(series) {
        const validated = Series.validate(series);
        if (!validated || !validated.syncId) {
            return null;
        }
        return {
            syncId: validated.syncId,
            name: validated.name,
            season: validated.season,
            episode: validated.episode,
            date: this.#serializeDate(validated.date),
            site: validated.site,
            note: validated.note,
            status: validated.status,
            updatedAt: validated.updatedAt,
            deletedAt: validated.deletedAt || null,
            imageUpdatedAt: validated.imageUpdatedAt || null,
            deviceId: validated.deviceId,
            rev: validated.rev
        };
    }


    #serializeDate(date) {
        if (!date) {
            return "";
        }
        if (date.toDate) {
            return date.toDate().toISOString().split("T")[0];
        }
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - timezoneOffset).toISOString().split("T")[0];
    }


    #getSettings() {
        return {
            containers: this.localStorage.getByKey(LocalStorage.CONTAINERS_KEY) || {},
            navbar: this.localStorage.getNavBarPosition() || null,
            preferredLanguage: localStorage.getItem(LocalStorage.PREFERRED_LANGUAGE_KEY) || null
        };
    }


    #applySettings(settings = {}) {
        if (settings.containers && typeof settings.containers === "object") {
            this.localStorage.setByKey(LocalStorage.CONTAINERS_KEY, settings.containers);
        }
        if (settings.navbar) {
            this.localStorage.setNavBarPosition(settings.navbar);
        }
        if (settings.preferredLanguage) {
            localStorage.setItem(LocalStorage.PREFERRED_LANGUAGE_KEY, settings.preferredLanguage);
        }
    }


    #waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }
}
