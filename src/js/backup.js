import Series from "./series";
import {saveAs} from "file-saver";
import AlertDialog from "./alertDialog";
import Database from "./database";
import SyncRepository from "./syncRepository";


export default class Backup {
    constructor(database, clear, initialize) {
        this.database = database;
        this.clear = clear;
        this.initialize = initialize;
        this.syncRepository = new SyncRepository(database);
    }


    getCreateBackupFunction() {
        return () => setTimeout(() => this.createBackup(), 0);
    }


    getLoadBackupFunction() {
        return () => setTimeout(() => this.loadBackup(), 0);
    }


    async createBackup() {
        const syncState = await this.syncRepository.getLocalState();
        const images = await this.#getAll(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
        const meta = await this.#getAll(Database.SERIES_META_OBJECT_STORE_NAME);
        const syncIdById = new Map(meta.map(item => [item.id, item.syncId]));
        const backup = {
            schemaVersion: SyncRepository.SCHEMA_VERSION,
            backupVersion: 2,
            updatedAt: syncState.updatedAt,
            series: syncState.series,
            deleted: syncState.deleted,
            settings: syncState.settings,
            images: images.map(image => ({
                syncId: syncIdById.get(image.id),
                image: image.image
            })).filter(image => image.syncId && image.image)
        };
        const blob = new Blob([JSON.stringify(backup)], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "SavingSeries.backup");
    }


    createLegacyBackup() {
        const metaRequest = this.database.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).getAll();
        metaRequest.onsuccess = () => {
            const imagesRequest = this.database.getReadOnlyObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME).getAll();
            imagesRequest.onsuccess = () => {
                const series = metaRequest.result;
                const images = imagesRequest.result;
                const backup = series.map(meta => {
                    const image = images.find(image => image.id === meta.id);
                    return {...meta, ...(image && {image: image.image})};
                });

                const blob = new Blob([JSON.stringify(backup)], {type: "text/plain;charset=utf-8"});
                saveAs(blob, "SavingSeries.backup");
            };
        };
    }


    async loadBackup() {
        let dialog = new AlertDialog(window.i18n.t("backup_load_confirm"));
        let result = await dialog.open();
        if (result) {
            let element = document.createElement("input");
            element.type = "file";
            element.onchange = (e) => this.onOpenFile(e);
            element.click();
        }
    }


    onOpenFile(event) {
        let reader = new FileReader();
        reader.onload = async () => {
            try {
                let data = JSON.parse("" + reader.result);

                if (data?.backupVersion === 2 && data?.schemaVersion === SyncRepository.SCHEMA_VERSION) {
                    await this.syncRepository.applyImportedState(this.#stateFromFullBackup(data));
                } else if (data?.schemaVersion === SyncRepository.SCHEMA_VERSION) {
                    await this.syncRepository.applyImportedState(data);
                } else if (Array.isArray(data)) { // V1
                    const preparedSeries = [];
                    const syncIds = new Set();
                    for (let series of data) {
                        const temp = Series.validate(series);
                        if (temp) {
                            const prepared = await this.database.prepareImportedSeries(temp);
                            if (prepared.syncId && syncIds.has(prepared.syncId)) {
                                throw new Error("Duplicate syncId in backup");
                            }
                            syncIds.add(prepared.syncId);
                            preparedSeries.push(prepared);
                        }
                    }
                    await this.#replaceWithLegacyBackup(preparedSeries);
                } else {
                    throw new Error("Unsupported backup format");
                }
                this.initialize();
                return;
            } catch (e) {
            }
            alert(window.i18n.t("backup_file_corrupted"));
        };
        reader.readAsText(event.target.files[0]);
    }


    async #replaceWithLegacyBackup(preparedSeries) {
        const transaction = this.database.database.transaction([
            Database.SERIES_META_OBJECT_STORE_NAME,
            Database.SERIES_IMAGES_OBJECT_STORE_NAME,
            Database.SYNC_DELETED_OBJECT_STORE_NAME,
            Database.SYNC_STATE_OBJECT_STORE_NAME
        ], "readwrite");
        const metaObjectStore = transaction.objectStore(Database.SERIES_META_OBJECT_STORE_NAME);
        const imagesObjectStore = transaction.objectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);
        transaction.objectStore(Database.SYNC_DELETED_OBJECT_STORE_NAME).clear();
        metaObjectStore.clear();
        imagesObjectStore.clear();
        for (let series of preparedSeries) {
            const {image, ...meta} = series;
            metaObjectStore.add(meta);
            if (image) {
                imagesObjectStore.add({id: meta.id, image: image});
            }
        }
        this.database.markGoogleDriveSyncDirtyInTransaction(transaction);
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
        window.dispatchEvent(new CustomEvent("savingseries:local-sync-dirty"));
    }


    #stateFromFullBackup(data) {
        const imagesBySyncId = new Map((data.images || []).map(image => [image.syncId, image.image]));
        return {
            schemaVersion: SyncRepository.SCHEMA_VERSION,
            updatedAt: data.updatedAt || Date.now(),
            series: (data.series || []).map(series => ({
                ...series,
                image: imagesBySyncId.get(series.syncId) || ""
            })),
            deleted: data.deleted || [],
            settings: data.settings || {}
        };
    }


    #getAll(storeName) {
        return new Promise((resolve, reject) => {
            const request = this.database.getReadOnlyObjectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
}
