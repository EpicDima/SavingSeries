import GoogleAuth from './googleAuth.js';
import GoogleDrive from './googleDrive.js';

/**
 * Google Drive Structured Sync Module
 * Implements efficient synchronization with separate metadata and image storage
 * Mirrors the IndexedDB structure for optimal performance
 */
export default class GoogleDriveSync {

    static METADATA_FILE = 'metadata.json';
    static IMAGES_FOLDER = 'images';
    static SYNC_VERSION = '2.0';

    // Track sync state
    static syncState = {
        lastSync: null,
        pendingChanges: new Set(),
        syncInProgress: false
    };

    /**
     * Initialize the structured storage in Google Drive
     * Creates the folder structure if it doesn't exist
     * @returns {Promise<void>}
     */
    static async initializeStructure() {
        console.log('Initializing Google Drive structured storage...');

        // Get or create app folder
        const appFolderId = await GoogleDrive.getOrCreateAppFolder();

        // Get or create images subfolder
        const imagesFolderId = await GoogleDrive.getOrCreateFolder(
            this.IMAGES_FOLDER,
            appFolderId
        );

        // Check if metadata file exists
        const metadataExists = await this.checkMetadataExists();

        if (!metadataExists) {
            // Create initial empty metadata file
            const initialMetadata = {
                version: this.SYNC_VERSION,
                lastModified: new Date().toISOString(),
                series: {},
                syncInfo: {
                    createdAt: new Date().toISOString(),
                    device: navigator.userAgent
                }
            };

            await GoogleDrive.uploadMetadata(initialMetadata);
            console.log('Created initial metadata structure');
        }

        console.log('Structured storage initialized');
        return {appFolderId, imagesFolderId};
    }

    /**
     * Sync metadata between local and Drive
     * @param {Object} localMetadata - Local series metadata (without images)
     * @returns {Promise<Object>} Merged metadata
     */
    static async syncMetadata(localMetadata) {
        if (this.syncState.syncInProgress) {
            console.log('Sync already in progress, skipping...');
            return null;
        }

        this.syncState.syncInProgress = true;

        try {
            // Download current Drive metadata
            const driveMetadata = await GoogleDrive.downloadMetadata();

            if (!driveMetadata) {
                // No metadata in Drive, upload local
                await GoogleDrive.uploadMetadata({
                    version: this.SYNC_VERSION,
                    lastModified: new Date().toISOString(),
                    series: localMetadata,
                    syncInfo: {
                        lastSync: new Date().toISOString(),
                        device: navigator.userAgent
                    }
                });

                this.syncState.lastSync = new Date();
                return localMetadata;
            }

            // Merge metadata based on last modified times
            const mergedMetadata = await this.mergeMetadata(localMetadata, driveMetadata.series || {});

            // Upload merged metadata back to Drive
            await GoogleDrive.uploadMetadata({
                version: this.SYNC_VERSION,
                lastModified: new Date().toISOString(),
                series: mergedMetadata,
                syncInfo: {
                    lastSync: new Date().toISOString(),
                    device: navigator.userAgent
                }
            });

            this.syncState.lastSync = new Date();
            console.log('Metadata sync completed');

            return mergedMetadata;
        } catch (error) {
            console.error('Metadata sync failed:', error);
            throw error;
        } finally {
            this.syncState.syncInProgress = false;
        }
    }

    /**
     * Upload or update a single image
     * @param {string|number} id - Series ID
     * @param {string|Blob} imageData - Image data (base64 or blob)
     * @returns {Promise<Object>} File metadata from Google Drive
     */
    static async syncImage(id, imageData) {
        if (!imageData) {
            console.log(`No image data for series ${id}`);
            return null;
        }

        console.log(`Syncing image for series ${id}`);

        // Convert base64 to blob if needed
        let imageBlob;
        let mimeType = 'image/jpeg'; // Default mime type

        if (typeof imageData === 'string') {
            // Extract mime type from base64 string
            const matches = imageData.match(/^data:([^;]+);base64,/);
            if (matches) {
                mimeType = matches[1];
                // Convert to blob
                imageBlob = GoogleDrive.base64ToBlob(imageData, mimeType);
            } else {
                throw new Error('Invalid image data format');
            }
        } else if (imageData instanceof Blob) {
            imageBlob = imageData;
            mimeType = imageData.type || mimeType;
        } else {
            throw new Error('Image data must be base64 string or Blob');
        }

        // Determine file extension from mime type
        const extension = this.getExtensionFromMimeType(mimeType);
        const fileName = `${id}.${extension}`;

        // Upload image to Drive
        return await GoogleDrive.uploadImage(id, imageBlob, fileName);
    }

    /**
     * Delete a single image from Drive
     * @param {string|number} id - Series ID
     * @returns {Promise<void>}
     */
    static async deleteImage(id) {
        console.log(`Deleting image for series ${id}`);

        try {
            const fileId = await GoogleDrive.getImageFileId(id);
            if (fileId) {
                await GoogleDrive.deleteFile(fileId);
                console.log(`Deleted image for series ${id}`);
            } else {
                console.log(`No image found for series ${id}`);
            }
        } catch (error) {
            console.error(`Failed to delete image for series ${id}:`, error);
            throw error;
        }
    }

    /**
     * Download a single image from Drive
     * @param {string|number} id - Series ID
     * @returns {Promise<string|null>} Base64 encoded image or null
     */
    static async getImage(id) {
        console.log(`Downloading image for series ${id}`);

        try {
            const base64Image = await GoogleDrive.downloadImage(id);
            if (base64Image) {
                console.log(`Downloaded image for series ${id}`);
                return base64Image;
            } else {
                console.log(`No image found for series ${id}`);
                return null;
            }
        } catch (error) {
            console.error(`Failed to download image for series ${id}:`, error);
            return null;
        }
    }

    /**
     * Perform full synchronization of all data
     * @param {Object} localData - Complete local data including metadata and images
     * @returns {Promise<Object>} Synchronized data
     */
    static async fullSync(localData) {
        console.log('Starting full sync with Google Drive...');

        try {
            // Initialize structure if needed
            await this.initializeStructure();

            // Separate metadata and images
            const localMetadata = {};
            const localImages = {};

            for (const [id, series] of Object.entries(localData)) {
                // Create metadata without image
                localMetadata[id] = {...series};
                delete localMetadata[id].image;

                // Store image separately
                if (series.image) {
                    localImages[id] = series.image;
                }
            }

            // Sync metadata first
            const mergedMetadata = await this.syncMetadata(localMetadata);

            // Get list of images in Drive
            const driveImages = await GoogleDrive.listImages();
            const driveImageIds = new Set(
                driveImages.map(file => this.extractIdFromFileName(file.name))
            );

            // Upload new and updated images
            const uploadPromises = [];
            for (const [id, imageData] of Object.entries(localImages)) {
                if (mergedMetadata[id]) {
                    // Series exists in merged metadata, sync image
                    uploadPromises.push(
                        this.syncImage(id, imageData)
                            .catch(error => {
                                console.error(`Failed to sync image ${id}:`, error);
                                return null;
                            })
                    );
                }
            }

            // Delete orphaned images (images without corresponding metadata)
            const deletePromises = [];
            for (const driveImageId of driveImageIds) {
                if (!mergedMetadata[driveImageId]) {
                    deletePromises.push(
                        this.deleteImage(driveImageId)
                            .catch(error => {
                                console.error(`Failed to delete orphaned image ${driveImageId}:`, error);
                            })
                    );
                }
            }

            // Wait for all image operations
            await Promise.all([...uploadPromises, ...deletePromises]);

            // Download any missing images from Drive
            const downloadPromises = [];
            for (const id of Object.keys(mergedMetadata)) {
                if (!localImages[id] && driveImageIds.has(id)) {
                    downloadPromises.push(
                        this.getImage(id)
                            .then(imageData => {
                                if (imageData) {
                                    mergedMetadata[id].image = imageData;
                                }
                            })
                            .catch(error => {
                                console.error(`Failed to download image ${id}:`, error);
                            })
                    );
                }
            }

            await Promise.all(downloadPromises);

            console.log('Full sync completed successfully');

            // Return merged data with images
            const syncedData = {};
            for (const [id, metadata] of Object.entries(mergedMetadata)) {
                syncedData[id] = {...metadata};
                if (localImages[id]) {
                    syncedData[id].image = localImages[id];
                }
            }

            return syncedData;
        } catch (error) {
            console.error('Full sync failed:', error);
            throw error;
        }
    }

    /**
     * Perform incremental sync with only changed items
     * @param {Object} changes - Object with added, modified, and deleted items
     * @returns {Promise<void>}
     */
    static async incrementalSync(changes) {
        console.log('Starting incremental sync...');

        if (!changes || (!changes.added && !changes.modified && !changes.deleted)) {
            console.log('No changes to sync');
            return;
        }

        try {
            // Download current metadata
            const driveMetadata = await GoogleDrive.downloadMetadata();
            if (!driveMetadata) {
                console.log('No Drive metadata found, falling back to full sync');
                return null;
            }

            const currentMetadata = driveMetadata.series || {};

            // Apply changes to metadata
            const updatedMetadata = {...currentMetadata};

            // Process additions and modifications
            const imageOperations = [];

            if (changes.added) {
                for (const [id, series] of Object.entries(changes.added)) {
                    // Add metadata
                    updatedMetadata[id] = {...series};
                    delete updatedMetadata[id].image;

                    // Upload image if present
                    if (series.image) {
                        imageOperations.push(
                            this.syncImage(id, series.image)
                                .catch(error => {
                                    console.error(`Failed to upload image ${id}:`, error);
                                })
                        );
                    }
                }
            }

            if (changes.modified) {
                for (const [id, series] of Object.entries(changes.modified)) {
                    // Update metadata
                    updatedMetadata[id] = {...series};
                    delete updatedMetadata[id].image;

                    // Update image if changed
                    if (series.image) {
                        imageOperations.push(
                            this.syncImage(id, series.image)
                                .catch(error => {
                                    console.error(`Failed to update image ${id}:`, error);
                                })
                        );
                    }
                }
            }

            if (changes.deleted) {
                for (const id of changes.deleted) {
                    // Remove from metadata
                    delete updatedMetadata[id];

                    // Delete image
                    imageOperations.push(
                        this.deleteImage(id)
                            .catch(error => {
                                console.error(`Failed to delete image ${id}:`, error);
                            })
                    );
                }
            }

            // Upload updated metadata
            await GoogleDrive.uploadMetadata({
                version: this.SYNC_VERSION,
                lastModified: new Date().toISOString(),
                series: updatedMetadata,
                syncInfo: {
                    lastSync: new Date().toISOString(),
                    device: navigator.userAgent,
                    incrementalUpdate: true
                }
            });

            // Wait for all image operations
            await Promise.all(imageOperations);

            console.log('Incremental sync completed');
            this.syncState.lastSync = new Date();
            this.syncState.pendingChanges.clear();
        } catch (error) {
            console.error('Incremental sync failed:', error);
            throw error;
        }
    }

    /**
     * Track a change for incremental sync
     * @param {string} type - Type of change: 'add', 'modify', 'delete'
     * @param {string|number} id - Series ID
     */
    static trackChange(type, id) {
        this.syncState.pendingChanges.add({type, id, timestamp: Date.now()});
        console.log(`Tracked ${type} change for series ${id}`);
    }

    /**
     * Get pending changes for sync
     * @returns {Object} Grouped changes by type
     */
    static getPendingChanges() {
        const changes = {
            added: [],
            modified: [],
            deleted: []
        };

        for (const change of this.syncState.pendingChanges) {
            switch (change.type) {
                case 'add':
                    changes.added.push(change.id);
                    break;
                case 'modify':
                    changes.modified.push(change.id);
                    break;
                case 'delete':
                    changes.deleted.push(change.id);
                    break;
            }
        }

        return changes;
    }

    /**
     * Check if metadata file exists
     * @returns {Promise<boolean>}
     */
    static async checkMetadataExists() {
        try {
            const appFolderId = await GoogleDrive.getOrCreateAppFolder();
            const query = `name = '${this.METADATA_FILE}' and '${appFolderId}' in parents and trashed = false`;
            const response = await GoogleDrive.listFiles(query);

            return response.files && response.files.length > 0;
        } catch (error) {
            console.error('Failed to check metadata existence:', error);
            return false;
        }
    }

    /**
     * Merge local and Drive metadata based on modification times
     * @param {Object} localMetadata - Local metadata
     * @param {Object} driveMetadata - Drive metadata
     * @returns {Object} Merged metadata
     */
    static mergeMetadata(localMetadata, driveMetadata) {
        const merged = {};
        const allIds = new Set([
            ...Object.keys(localMetadata),
            ...Object.keys(driveMetadata)
        ]);

        for (const id of allIds) {
            const localSeries = localMetadata[id];
            const driveSeries = driveMetadata[id];

            if (!localSeries && driveSeries) {
                // Only in Drive
                merged[id] = driveSeries;
            } else if (localSeries && !driveSeries) {
                // Only local
                merged[id] = localSeries;
            } else if (localSeries && driveSeries) {
                // In both - compare modification times
                const localTime = new Date(localSeries.lastModified || 0).getTime();
                const driveTime = new Date(driveSeries.lastModified || 0).getTime();

                // Use the more recent version
                merged[id] = localTime >= driveTime ? localSeries : driveSeries;
            }
        }

        return merged;
    }

    /**
     * Get file extension from MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File extension
     */
    static getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        };

        return mimeToExt[mimeType] || 'jpg';
    }

    /**
     * Extract series ID from image filename
     * @param {string} fileName - Image filename (e.g., "123.jpg")
     * @returns {string} Series ID
     */
    static extractIdFromFileName(fileName) {
        const match = fileName.match(/^(\d+)\./);
        return match ? match[1] : null;
    }

    /**
     * Migrate from old backup format to new structured format
     * @param {Object} oldBackupData - Old format backup data
     * @returns {Promise<void>}
     */
    static async migrateFromOldFormat(oldBackupData) {
        console.log('Migrating from old backup format to structured format...');

        try {
            // Initialize new structure
            await this.initializeStructure();

            // Extract series data
            const series = oldBackupData.series || {};

            // Perform full sync with the old data
            await this.fullSync(series);

            console.log('Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    /**
     * Check if Drive has old format backup
     * @returns {Promise<boolean>}
     */
    static async hasOldFormatBackup() {
        try {
            const backups = await GoogleDrive.listBackups();
            return backups && backups.length > 0;
        } catch (error) {
            console.error('Failed to check for old backups:', error);
            return false;
        }
    }

    /**
     * Get sync status information
     * @returns {Object} Sync status
     */
    static getSyncStatus() {
        return {
            lastSync: this.syncState.lastSync,
            syncInProgress: this.syncState.syncInProgress,
            pendingChanges: this.syncState.pendingChanges.size,
            isConnected: GoogleAuth.isAuthenticated()
        };
    }
}