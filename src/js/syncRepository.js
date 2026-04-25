import Database from "./database";
import Series from "./series";
import LocalStorage from "./localStorage";
import {SyncRestartRequiredError} from "./syncService";


export default class SyncRepository {
    static SCHEMA_VERSION = 1;

    static sanitizeDriveFileNamePart(value) {
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
    }

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


    async applyMergedState(state, {expectedGeneration = null} = {}) {
        await this.#replaceState(state, {expectedGeneration});
        this.#applySettings(state.settings);
    }


    async applyImportedState(state) {
        await this.#replaceState(state, {markDirty: true});
        this.#applySettings(state.settings);
    }


    async #replaceState(state, {expectedGeneration = null, markDirty = false} = {}) {
        const [existingImages, localDeviceId] = await Promise.all([
            this.#getExistingImagesBySyncId(),
            this.database.getDeviceId()
        ]);
        const preparedState = this.#prepareStateForApply(state, localDeviceId);

        await new Promise((resolve, reject) => {
            const transaction = this.database.database.transaction([
                Database.SERIES_META_OBJECT_STORE_NAME,
                Database.SERIES_IMAGES_OBJECT_STORE_NAME,
                Database.SYNC_DELETED_OBJECT_STORE_NAME,
                Database.SYNC_STATE_OBJECT_STORE_NAME
            ], "readwrite");
            const metaStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
            const imagesStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
            const deletedStore = transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME);
            const syncStateStore = transaction.objectStore(Database.SYNC_STATE_OBJECT_STORE_NAME);
            const generationRequest = syncStateStore.get(Database.LOCAL_GENERATION_KEY);

            generationRequest.onsuccess = () => {
                const currentGeneration = Number(generationRequest.result?.value || 0);
                if (expectedGeneration !== null && currentGeneration !== Number(expectedGeneration)) {
                    transaction.abort();
                    return;
                }

                metaStore.clear();
                imagesStore.clear();
                deletedStore.clear();

                for (const prepared of preparedState.images) {
                    const meta = prepared.meta;
                    metaStore.put(meta);

                    const existingImage = existingImages.get(meta.syncId);
                    if (prepared.image) {
                        imagesStore.put({id: meta.id, image: prepared.image});
                    } else if (existingImage?.image && Number(existingImage.imageUpdatedAt || 0) === Number(meta.imageUpdatedAt || 0)) {
                        imagesStore.put({id: meta.id, image: existingImage.image});
                    }
                }

                for (const item of preparedState.deleted) {
                    deletedStore.put(item);
                }

                if (markDirty) {
                    this.database.markGoogleDriveSyncDirtyInTransaction(transaction);
                }
            };
            generationRequest.onerror = () => reject(generationRequest.error);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new SyncRestartRequiredError("Local data changed during sync; retrying"));
        });
        if (markDirty) {
            window.dispatchEvent(new CustomEvent("savingseries:local-sync-dirty"));
        }
    }


    #prepareStateForApply(state, localDeviceId) {
        if (!state || state.schemaVersion !== SyncRepository.SCHEMA_VERSION || !Array.isArray(state.series)) {
            throw new Error("Unsupported sync state format");
        }
        if (state.deleted && !Array.isArray(state.deleted)) {
            throw new Error("Unsupported sync state format");
        }

        let nextId = 1;
        const syncIds = new Set();
        const series = state.series.map(item => {
            const validated = Series.validate({
                ...item,
                id: nextId,
                deviceId: item.deviceId || localDeviceId
            });
            if (!validated || !validated.syncId || validated.deletedAt) {
                throw new Error("Unsupported sync state format");
            }
            if (syncIds.has(validated.syncId)) {
                throw new Error("Unsupported sync state format");
            }
            syncIds.add(validated.syncId);
            const {image, ...meta} = validated;
            meta.id = nextId++;
            return {meta, image: image || ""};
        });
        const deleted = (state.deleted || []).map(item => {
            if (!item?.syncId || !item.deletedAt) {
                throw new Error("Unsupported sync state format");
            }
            return {
                syncId: item.syncId,
                deletedAt: item.deletedAt,
                deviceId: item.deviceId || localDeviceId
            };
        });

        return {series: series.map(item => item.meta), images: series, deleted};
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
        const metaByLocalId = new Map(series.map(item => [item.id, item]));
        const imagesBySyncId = new Map();
        for (const image of images) {
            const meta = metaByLocalId.get(image.id);
            if (meta?.syncId && image.image) {
                imagesBySyncId.set(meta.syncId, {
                    image: image.image,
                    imageUpdatedAt: meta.imageUpdatedAt || null
                });
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
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
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
