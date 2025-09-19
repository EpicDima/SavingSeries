import Series from "./series";
import {saveAs} from "file-saver";
import AlertDialog from "./alertDialog";
import Database from "./database";


export default class Backup {
    constructor(database, clear, initialize) {
        this.database = database;
        this.clear = clear;
        this.initialize = initialize;
    }


    getCreateBackupFunction() {
        return () => setTimeout(() => this.createBackup(), 0);
    }


    getLoadBackupFunction() {
        return () => setTimeout(() => this.loadBackup(), 0);
    }


    createBackup() {
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
                await this.importData(data);
                return;
            } catch (e) {
                console.error('[DEBUG] Failed to load backup file:', e);
            }
            alert(window.i18n.t("backup_file_corrupted"));
        };
        reader.readAsText(event.target.files[0]);
    }


    /**
     * Import data into the database
     * @param {Array} data - The backup data to import
     * @returns {Promise<void>}
     */
    async importData(data) {
        console.log('[DEBUG] importData START - Received data:', {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : 'N/A',
            firstItem: data && data[0] ? Object.keys(data[0]) : 'N/A'
        });

        await this.clear();
        console.log('[DEBUG] Database cleared - confirmed all clear operations completed');

        let metaObjectStore = this.database.getReadWriteObjectStore(Database.SERIES_META_OBJECT_STORE_NAME);
        let imagesObjectStore = this.database.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME);

        let addedCount = 0;
        let pendingOperations = [];

        if (Array.isArray(data)) { // V1
            for (let series of data) {
                let temp = Series.validate(series);
                if (temp) {
                    const {image, ...meta} = temp;
                    console.log('[DEBUG] Adding series to DB:', {
                        id: meta.id,
                        name: meta.name,
                        hasImage: !!image
                    });

                    // Create promises for each database operation
                    const metaPromise = new Promise((resolve, reject) => {
                        let metaRequest = metaObjectStore.add(meta);
                        metaRequest.onsuccess = () => {
                            console.log('[DEBUG] Series meta saved successfully:', meta.id);
                            resolve();
                        };
                        metaRequest.onerror = (e) => {
                            console.error('[DEBUG] Failed to save series meta:', meta.id, e);
                            // Don't reject on duplicate keys, just resolve
                            if (e.target.error.name === 'ConstraintError') {
                                resolve();
                            } else {
                                reject(e);
                            }
                        };
                    });
                    pendingOperations.push(metaPromise);

                    if (image) {
                        const imagePromise = new Promise((resolve, reject) => {
                            let imageRequest = imagesObjectStore.add({id: meta.id, image: image});
                            imageRequest.onsuccess = () => {
                                console.log('[DEBUG] Series image saved successfully:', meta.id);
                                resolve();
                            };
                            imageRequest.onerror = (e) => {
                                console.error('[DEBUG] Failed to save series image:', meta.id, e);
                                // Don't reject on duplicate keys, just resolve
                                if (e.target.error.name === 'ConstraintError') {
                                    resolve();
                                } else {
                                    reject(e);
                                }
                            };
                        });
                        pendingOperations.push(imagePromise);
                    }
                    addedCount++;
                }
            }
        }

        console.log('[DEBUG] Waiting for', pendingOperations.length, 'database operations to complete...');

        // Wait for all database operations to complete
        try {
            await Promise.all(pendingOperations);
            console.log('[DEBUG] All database operations completed successfully');
        } catch (error) {
            console.error('[DEBUG] Some database operations failed:', error);
            // Continue anyway, as some data may have been saved
        }

        // Verify the data was saved
        const verifyRequest = this.database.getReadOnlyObjectStore(Database.SERIES_META_OBJECT_STORE_NAME).count();
        const count = await new Promise(resolve => {
            verifyRequest.onsuccess = () => resolve(verifyRequest.result);
        });
        console.log('[DEBUG] Database verification - series count:', count);

        // NOW it's safe to refresh the UI
        console.log('[DEBUG] Calling initialize() after all DB operations are complete');
        this.initialize();
    }


    /**
     * Export backup data without downloading (for Google Drive)
     * @returns {Promise<Array>} The backup data
     */
    exportForDrive() {
        return new Promise((resolve, reject) => {
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
                    resolve(backup);
                };
                imagesRequest.onerror = () => reject(imagesRequest.error);
            };
            metaRequest.onerror = () => reject(metaRequest.error);
        });
    }


    /**
     * Import data from Google Drive
     * @param {Array} data - The backup data from Google Drive
     * @returns {Promise<void>}
     */
    async importFromDriveData(data) {
        try {
            console.log('[DEBUG] importFromDriveData START');
            console.log('[DEBUG] Received data structure:', {
                type: typeof data,
                isArray: Array.isArray(data),
                hasSeriesProperty: data && typeof data === 'object' && 'series' in data,
                keys: data && typeof data === 'object' ? Object.keys(data) : null,
                dataLength: Array.isArray(data) ? data.length : 'N/A',
                seriesLength: data && data.series && Array.isArray(data.series) ? data.series.length : 'N/A'
            });

            let seriesData;

            // Handle both formats
            if (Array.isArray(data)) {
                // Legacy format: direct array
                console.log('[DEBUG] Using legacy format (direct array)');
                seriesData = data;
            } else if (data && typeof data === 'object' && data.series) {
                // New format: object with series property
                console.log('[DEBUG] Using new format (object with series property)');
                seriesData = data.series;
            } else {
                console.error('[DEBUG] Invalid format - data structure:', data);
                throw new Error('Invalid backup data format');
            }

            // Validate the series data is an array
            if (!Array.isArray(seriesData)) {
                console.error('[DEBUG] Series data is not an array:', seriesData);
                throw new Error('Series data must be an array');
            }

            console.log('[DEBUG] About to call importData with', seriesData.length, 'series');
            console.log('[DEBUG] Sample series data:', seriesData[0] ? {
                id: seriesData[0].id,
                name: seriesData[0].name,
                hasImage: !!seriesData[0].image
            } : 'No data');

            // Now properly await the async importData method
            await this.importData(seriesData);
            console.log('[DEBUG] importData completed - all data should be saved');

        } catch (error) {
            console.error('[DEBUG] importFromDriveData failed:', error);
            throw error;
        }
    }
}
