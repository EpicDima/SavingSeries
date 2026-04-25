import GoogleDriveClient from "./googleDriveClient";
import SyncRepository from "./syncRepository";


export default class ImageSyncQueue {
    static INDEX_SCHEMA_VERSION = 1;
    static MAX_CONCURRENT_UPLOADS = 2;
    static MAX_CONCURRENT_DOWNLOADS = 4;
    static MAX_CONCURRENT_DELETES = 4;

    constructor(database, googleDriveClient) {
        this.database = database;
        this.googleDriveClient = googleDriveClient;
    }


    async syncImages(mergedState, remoteIndexFileState = null, localState = mergedState, remoteState = mergedState) {
        const remoteIndex = this.#normalizeIndex(remoteIndexFileState?.content);
        const remoteImages = remoteIndex.images || {};
        const localSeries = this.#mapSeriesBySyncId(localState.series);
        const remoteSeries = this.#mapSeriesBySyncId(remoteState.series);
        const deletedSyncIds = new Set((mergedState.deleted || []).map(item => item.syncId));
        const uploadTasks = [];
        const downloadTasks = [];
        const deleteTasks = [];
        const localDeleteTasks = [];

        for (const item of mergedState.series || []) {
            const localImageUpdatedAt = Number(localSeries.get(item.syncId)?.imageUpdatedAt || 0);
            const remoteMetadataImageUpdatedAt = Number(remoteSeries.get(item.syncId)?.imageUpdatedAt || 0);
            const remoteImageUpdatedAt = Number(remoteImages[item.syncId]?.imageUpdatedAt || 0);
            if (!Number(item.imageUpdatedAt || 0)) {
                if (remoteImages[item.syncId]) {
                    deleteTasks.push({syncId: item.syncId, remote: remoteImages[item.syncId]});
                }
                continue;
            }
            if (localImageUpdatedAt > remoteImageUpdatedAt && localImageUpdatedAt >= remoteMetadataImageUpdatedAt) {
                uploadTasks.push({syncId: item.syncId, imageUpdatedAt: item.imageUpdatedAt, remote: remoteImages[item.syncId]});
            } else if (remoteImageUpdatedAt > localImageUpdatedAt && remoteImages[item.syncId]?.fileId) {
                downloadTasks.push({syncId: item.syncId, imageUpdatedAt: remoteImageUpdatedAt, remote: remoteImages[item.syncId]});
            } else if (remoteMetadataImageUpdatedAt > localImageUpdatedAt && !remoteImages[item.syncId]) {
                localDeleteTasks.push({syncId: item.syncId, imageUpdatedAt: remoteMetadataImageUpdatedAt});
            }
        }

        for (const syncId of Object.keys(remoteImages)) {
            if (deletedSyncIds.has(syncId)) {
                deleteTasks.push({syncId, remote: remoteImages[syncId]});
            }
        }

        const nextImages = {...remoteImages};
        await this.#runLimited(deleteTasks, ImageSyncQueue.MAX_CONCURRENT_DELETES, task => this.#deleteRemoteImage(task, nextImages));
        await this.#runLimited(localDeleteTasks, ImageSyncQueue.MAX_CONCURRENT_DELETES, task => this.#deleteLocalImage(task));
        await this.#runLimited(uploadTasks, ImageSyncQueue.MAX_CONCURRENT_UPLOADS, task => this.#uploadImage(task, nextImages));
        await this.#runLimited(downloadTasks, ImageSyncQueue.MAX_CONCURRENT_DOWNLOADS, task => this.#downloadImage(task));

        const nextIndex = {
            schemaVersion: ImageSyncQueue.INDEX_SCHEMA_VERSION,
            updatedAt: Date.now(),
            images: nextImages
        };
        const file = uploadTasks.length || downloadTasks.length || deleteTasks.length || !remoteIndexFileState?.file
            ? await this.#writeRemoteIndex(remoteIndexFileState?.file, nextIndex)
            : remoteIndexFileState.file;

        return {
            indexFileId: file.id,
            uploaded: uploadTasks.length,
            downloaded: downloadTasks.length,
            deleted: deleteTasks.length + localDeleteTasks.length
        };
    }


    async readRemoteIndex(indexFileId) {
        try {
            if (indexFileId) {
                return await this.googleDriveClient.readJsonFileById(indexFileId);
            }
        } catch (error) {
            console.warn("Stored Google Drive images index is unavailable, falling back to name lookup:", error);
        }
        return this.googleDriveClient.readJsonFileByName(GoogleDriveClient.IMAGES_INDEX_FILE_NAME);
    }


    async #writeRemoteIndex(remoteFile, index) {
        if (remoteFile?.id) {
            return this.googleDriveClient.updateJsonFile(remoteFile.id, index, remoteFile.etag);
        }
        return this.googleDriveClient.createJsonFile(GoogleDriveClient.IMAGES_INDEX_FILE_NAME, index);
    }


    #normalizeIndex(index) {
        if (!index) {
            return {
                schemaVersion: ImageSyncQueue.INDEX_SCHEMA_VERSION,
                updatedAt: 0,
                images: {}
            };
        }
        if (index.schemaVersion !== ImageSyncQueue.INDEX_SCHEMA_VERSION || !index.images || typeof index.images !== "object") {
            throw new Error("Unsupported image sync index format");
        }
        return index;
    }


    #mapSeriesBySyncId(series = []) {
        const map = new Map();
        for (const item of series || []) {
            if (item?.syncId) {
                map.set(item.syncId, item);
            }
        }
        return map;
    }


    async #uploadImage(task, nextImages) {
        const image = await this.database.getSeriesImageBySyncId(task.syncId);
        if (!image) {
            await this.#deleteRemoteImage(task, nextImages);
            delete nextImages[task.syncId];
            return;
        }
        const blob = await this.#dataUrlToWebpBlob(image);
        const fileName = this.#getImageFileName(task.syncId);
        const file = await this.googleDriveClient.createOrUpdateBlobFileByName(fileName, blob,
            GoogleDriveClient.IMAGE_MIME_TYPE, task.remote?.fileId);
        nextImages[task.syncId] = {
            fileId: file.id,
            fileName: fileName,
            mimeType: GoogleDriveClient.IMAGE_MIME_TYPE,
            imageUpdatedAt: task.imageUpdatedAt,
            size: Number(file.size || blob.size || 0)
        };
    }


    async #downloadImage(task) {
        const blob = await this.googleDriveClient.readBlobFile(task.remote.fileId);
        if (blob.type && blob.type !== GoogleDriveClient.IMAGE_MIME_TYPE) {
            console.warn("Unexpected Google Drive image MIME type:", blob.type);
        }
        const dataUrl = await this.#blobToDataUrl(blob);
        await this.database.putSeriesImageBySyncIdIfCurrent(task.syncId, dataUrl, task.imageUpdatedAt);
    }


    async #deleteRemoteImage(task, nextImages) {
        if (task.remote?.fileId) {
            try {
                await this.googleDriveClient.deleteFile(task.remote.fileId);
            } catch (error) {
                console.warn("Failed to delete Google Drive image file:", error);
            }
        }
        delete nextImages[task.syncId];
    }


    async #deleteLocalImage(task) {
        await this.database.deleteSeriesImageBySyncIdIfCurrent(task.syncId, task.imageUpdatedAt);
    }


    async #dataUrlToWebpBlob(dataUrl) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        if (blob.type === GoogleDriveClient.IMAGE_MIME_TYPE) {
            return blob;
        }
        const imageBitmap = await createImageBitmap(blob);
        try {
            const canvas = document.createElement("canvas");
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            const context = canvas.getContext("2d");
            context.drawImage(imageBitmap, 0, 0);
            return await new Promise((resolve, reject) => {
                canvas.toBlob((webpBlob) => webpBlob ? resolve(webpBlob) : reject(new Error("WebP conversion failed")),
                    GoogleDriveClient.IMAGE_MIME_TYPE, 0.8);
            });
        } finally {
            imageBitmap.close?.();
        }
    }


    async #blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }


    async #runLimited(tasks, concurrency, handler) {
        const queue = [...tasks];
        const workers = Array.from({length: Math.min(concurrency, queue.length)}, async () => {
            while (queue.length > 0) {
                const task = queue.shift();
                try {
                    await handler(task);
                } catch (error) {
                    console.warn("Google Drive image sync task failed:", error);
                }
            }
        });
        await Promise.all(workers);
    }


    #getImageFileName(syncId) {
        return `saving-series-image-${SyncRepository.sanitizeDriveFileNamePart(syncId)}.webp`;
    }
}
