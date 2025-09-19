import GoogleAuth from './googleAuth.js';

/**
 * Google Drive API Module
 * Implements direct Google Drive API v3 operations using fetch
 * Manages file uploads, downloads, and backup operations
 */
export default class GoogleDrive {

    // API Endpoints
    static BASE_URL = 'https://www.googleapis.com/drive/v3';
    static UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

    // File constants
    static APP_FOLDER_NAME = 'SavingSeries';
    static BACKUP_PREFIX = 'savingseries_backup_';
    static DEFAULT_FIELDS = 'id, name, mimeType, modifiedTime, size, parents, createdTime';

    // Multipart upload boundary
    static BOUNDARY = '-------314159265358979323846';

    // Cache for app folder ID
    static appFolderId = null;

    /**
     * Core File Operations
     */

    /**
     * Upload a new file to Google Drive
     * @param {string} fileName - Name of the file
     * @param {string|ArrayBuffer|Blob} content - File content
     * @param {string} mimeType - MIME type of the file
     * @param {string} parentId - Parent folder ID (optional)
     * @returns {Promise<Object>} File metadata from Google Drive
     */
    static async uploadFile(fileName, content, mimeType, parentId = null) {
        // Ensure we have the app folder if no parent specified
        if (!parentId) {
            parentId = await this.getOrCreateAppFolder();
        }

        // Prepare metadata
        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: parentId ? [parentId] : ['appDataFolder']
        };

        // Convert content to appropriate format
        const fileContent = await this.prepareContent(content, mimeType);

        // Build multipart request body
        const multipartBody = this.buildMultipartBody(metadata, fileContent, mimeType);

        // Make the upload request
        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.UPLOAD_URL}/files?uploadType=multipart&fields=${this.DEFAULT_FIELDS}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/related; boundary=${this.BOUNDARY}`
                    },
                    body: multipartBody
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to upload file: ${error}`);
        }

        const fileData = await response.json();
        console.log(`File uploaded successfully: ${fileData.name} (${fileData.id})`);
        return fileData;
    }

    /**
     * Update an existing file's content
     * @param {string} fileId - ID of the file to update
     * @param {string|ArrayBuffer|Blob} content - New file content
     * @param {string} mimeType - MIME type of the file
     * @returns {Promise<Object>} Updated file metadata
     */
    static async updateFile(fileId, content, mimeType) {
        // Convert content to appropriate format
        const fileContent = await this.prepareContent(content, mimeType);

        // For updates, we need to use a PATCH request with multipart
        const metadata = {}; // Empty metadata for content-only update
        const multipartBody = this.buildMultipartBody(metadata, fileContent, mimeType);

        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.UPLOAD_URL}/files/${fileId}?uploadType=multipart&fields=${this.DEFAULT_FIELDS}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': `multipart/related; boundary=${this.BOUNDARY}`
                    },
                    body: multipartBody
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to update file: ${error}`);
        }

        const fileData = await response.json();
        console.log(`File updated successfully: ${fileData.name} (${fileData.id})`);
        return fileData;
    }

    /**
     * Delete a file from Google Drive
     * @param {string} fileId - ID of the file to delete
     * @returns {Promise<void>}
     */
    static async deleteFile(fileId) {
        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/files/${fileId}`,
                {
                    method: 'DELETE'
                }
            );
        });

        if (!response.ok && response.status !== 204) {
            const error = await response.text();
            throw new Error(`Failed to delete file: ${error}`);
        }

        console.log(`File deleted successfully: ${fileId}`);
    }

    /**
     * Download file content from Google Drive
     * @param {string} fileId - ID of the file to download
     * @param {boolean} asText - Whether to return content as text (true) or blob (false)
     * @returns {Promise<string|Blob>} File content
     */
    static async getFile(fileId, asText = true) {
        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/files/${fileId}?alt=media`,
                {
                    method: 'GET'
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to download file: ${error}`);
        }

        if (asText) {
            return await response.text();
        } else {
            return await response.blob();
        }
    }

    /**
     * List files with optional search query
     * @param {string} query - Optional search query (Drive API query syntax)
     * @param {number} pageSize - Number of results per page
     * @param {string} pageToken - Token for pagination
     * @returns {Promise<Object>} List of files with pagination info
     */
    static async listFiles(query = null, pageSize = 100, pageToken = null) {
        const params = new URLSearchParams({
            pageSize: pageSize.toString(),
            fields: `nextPageToken, files(${this.DEFAULT_FIELDS})`,
            spaces: 'drive,appDataFolder'
        });

        if (query) {
            params.append('q', query);
        }

        if (pageToken) {
            params.append('pageToken', pageToken);
        }

        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/files?${params.toString()}`,
                {
                    method: 'GET'
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to list files: ${error}`);
        }

        return await response.json();
    }

    /**
     * Backup-Specific Methods
     */

    /**
     * Upload a backup to Google Drive
     * @param {Object} backupData - Backup data object to be JSON stringified
     * @returns {Promise<Object>} File metadata from Google Drive
     */
    static async uploadBackup(backupData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${this.BACKUP_PREFIX}${timestamp}.json`;

        // Convert backup data to JSON string
        const content = JSON.stringify(backupData, null, 2);

        // Upload to app folder
        return await this.uploadFile(fileName, content, 'application/json');
    }

    /**
     * Download and parse a backup file
     * @param {string} fileId - ID of the backup file
     * @returns {Promise<Object>} Parsed backup data
     */
    static async downloadBackup(fileId) {
        const content = await this.getFile(fileId, true);

        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to parse backup file: ${error.message}`);
        }
    }

    /**
     * List all backup files in Drive
     * @returns {Promise<Array>} Array of backup file metadata
     */
    static async listBackups() {
        const appFolderId = await this.getOrCreateAppFolder();
        const query = `name contains '${this.BACKUP_PREFIX}' and '${appFolderId}' in parents and trashed = false`;

        const allBackups = [];
        let pageToken = null;

        do {
            const response = await this.listFiles(query, 100, pageToken);

            if (response.files) {
                allBackups.push(...response.files);
            }

            pageToken = response.nextPageToken;
        } while (pageToken);

        // Sort by modified time (newest first)
        allBackups.sort((a, b) => {
            return new Date(b.modifiedTime) - new Date(a.modifiedTime);
        });

        return allBackups;
    }

    /**
     * Get the most recent backup file
     * @returns {Promise<Object|null>} Latest backup data or null if no backups
     */
    static async getLatestBackup() {
        const backups = await this.listBackups();

        if (backups.length === 0) {
            console.log('No backups found');
            return null;
        }

        const latestBackup = backups[0];
        console.log(`Found latest backup: ${latestBackup.name} (${latestBackup.id})`);

        return await this.downloadBackup(latestBackup.id);
    }

    /**
     * Metadata Management
     */

    /**
     * Create a folder in Google Drive
     * @param {string} folderName - Name of the folder
     * @param {string} parentId - Parent folder ID (optional)
     * @returns {Promise<Object>} Folder metadata
     */
    static async createFolder(folderName, parentId = null) {
        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : ['root']
        };

        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/files?fields=${this.DEFAULT_FIELDS}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metadata)
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create folder: ${error}`);
        }

        const folderData = await response.json();
        console.log(`Folder created: ${folderData.name} (${folderData.id})`);
        return folderData;
    }

    /**
     * Search for files by name or content
     * @param {string} searchQuery - Search term
     * @param {string} mimeType - Optional MIME type filter
     * @returns {Promise<Array>} Array of matching files
     */
    static async searchFiles(searchQuery, mimeType = null) {
        let query = `fullText contains '${searchQuery}' and trashed = false`;

        if (mimeType) {
            query += ` and mimeType = '${mimeType}'`;
        }

        const response = await this.listFiles(query);
        return response.files || [];
    }

    /**
     * Get file metadata without downloading content
     * @param {string} fileId - ID of the file
     * @returns {Promise<Object>} File metadata
     */
    static async getFileMetadata(fileId) {
        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/files/${fileId}?fields=${this.DEFAULT_FIELDS}`,
                {
                    method: 'GET'
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get file metadata: ${error}`);
        }

        return await response.json();
    }

    /**
     * Helper Methods
     */

    /**
     * Get or create the app-specific folder
     * @returns {Promise<string>} Folder ID
     */
    static async getOrCreateAppFolder() {
        // Return cached folder ID if available
        if (this.appFolderId) {
            return this.appFolderId;
        }

        // Search for existing app folder
        const query = `name = '${this.APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const response = await this.listFiles(query);

        if (response.files && response.files.length > 0) {
            // Folder exists, cache and return its ID
            this.appFolderId = response.files[0].id;
            console.log(`Using existing app folder: ${this.appFolderId}`);
            return this.appFolderId;
        }

        // Create new app folder
        const folder = await this.createFolder(this.APP_FOLDER_NAME);
        this.appFolderId = folder.id;
        return this.appFolderId;
    }

    /**
     * Prepare content for upload (handle base64, binary, text)
     * @param {string|ArrayBuffer|Blob} content - Raw content
     * @param {string} mimeType - MIME type
     * @returns {Promise<Blob>} Prepared content as Blob
     */
    static async prepareContent(content, mimeType) {
        // If already a Blob, return as is
        if (content instanceof Blob) {
            return content;
        }

        // If ArrayBuffer, convert to Blob
        if (content instanceof ArrayBuffer) {
            return new Blob([content], {type: mimeType});
        }

        // If string, check if it's base64 encoded image data
        if (typeof content === 'string') {
            // Check for base64 data URI
            const base64Match = content.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
                // Extract base64 data and convert to binary
                const base64Data = base64Match[2];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);

                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                return new Blob([bytes], {type: base64Match[1]});
            }

            // Regular string content (JSON, text, etc.)
            return new Blob([content], {type: mimeType});
        }

        throw new Error('Unsupported content type');
    }

    /**
     * Build multipart request body for file upload
     * @param {Object} metadata - File metadata
     * @param {Blob} content - File content as Blob
     * @param {string} mimeType - MIME type of the content
     * @returns {Promise<Blob>} Multipart body as Blob
     */
    static buildMultipartBody(metadata, content, mimeType) {
        const parts = [];

        // Add metadata part
        parts.push(`--${this.BOUNDARY}\r\n`);
        parts.push('Content-Type: application/json; charset=UTF-8\r\n\r\n');
        parts.push(JSON.stringify(metadata));
        parts.push('\r\n');

        // Add content part
        parts.push(`--${this.BOUNDARY}\r\n`);
        parts.push(`Content-Type: ${mimeType}\r\n\r\n`);

        // Create the multipart body
        const textParts = new Blob(parts);
        const contentPart = content;
        const endBoundary = new Blob([`\r\n--${this.BOUNDARY}--`]);

        return new Blob([textParts, contentPart, endBoundary]);
    }

    /**
     * Upload a file using resumable upload (for large files)
     * @param {string} fileName - Name of the file
     * @param {Blob} content - File content as Blob
     * @param {string} mimeType - MIME type
     * @param {string} parentId - Parent folder ID (optional)
     * @param {Function} progressCallback - Progress callback (optional)
     * @returns {Promise<Object>} File metadata
     */
    static async uploadFileResumable(fileName, content, mimeType, parentId = null, progressCallback = null) {
        // Ensure we have the app folder if no parent specified
        if (!parentId) {
            parentId = await this.getOrCreateAppFolder();
        }

        // Step 1: Initiate resumable upload session
        const metadata = {
            name: fileName,
            mimeType: mimeType,
            parents: parentId ? [parentId] : ['appDataFolder']
        };

        const initResponse = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.UPLOAD_URL}/files?uploadType=resumable&fields=${this.DEFAULT_FIELDS}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Upload-Content-Type': mimeType,
                        'X-Upload-Content-Length': content.size.toString()
                    },
                    body: JSON.stringify(metadata)
                }
            );
        });

        if (!initResponse.ok) {
            const error = await initResponse.text();
            throw new Error(`Failed to initiate resumable upload: ${error}`);
        }

        // Get the resumable upload URL from response header
        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) {
            throw new Error('No upload URL received from server');
        }

        // Step 2: Upload the file content
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': mimeType
            },
            body: content
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            throw new Error(`Failed to upload file content: ${error}`);
        }

        const fileData = await uploadResponse.json();
        console.log(`File uploaded (resumable): ${fileData.name} (${fileData.id})`);

        // Call progress callback if provided
        if (progressCallback) {
            progressCallback(100);
        }

        return fileData;
    }

    /**
     * Convert base64 string to Blob
     * @param {string} base64 - Base64 encoded string
     * @param {string} mimeType - MIME type
     * @returns {Blob} Blob object
     */
    static base64ToBlob(base64, mimeType) {
        // Remove data URI prefix if present
        const base64Data = base64.replace(/^data:[^;]+;base64,/, '');

        // Decode base64
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], {type: mimeType});
    }

    /**
     * Convert Blob to base64 string
     * @param {Blob} blob - Blob object
     * @returns {Promise<string>} Base64 encoded string with data URI
     */
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Delete all backups except the most recent N
     * @param {number} keepCount - Number of recent backups to keep
     * @returns {Promise<number>} Number of backups deleted
     */
    static async cleanupOldBackups(keepCount = 5) {
        const backups = await this.listBackups();

        if (backups.length <= keepCount) {
            console.log('No old backups to clean up');
            return 0;
        }

        const backupsToDelete = backups.slice(keepCount);
        let deletedCount = 0;

        for (const backup of backupsToDelete) {
            try {
                await this.deleteFile(backup.id);
                deletedCount++;
                console.log(`Deleted old backup: ${backup.name}`);
            } catch (error) {
                console.error(`Failed to delete backup ${backup.name}:`, error);
            }
        }

        console.log(`Cleaned up ${deletedCount} old backups`);
        return deletedCount;
    }

    /**
     * Check if Google Drive API is accessible
     * @returns {Promise<boolean>} True if API is accessible
     */
    static async checkConnection() {
        try {
            // Try to get the About resource which contains user and storage info
            const response = await GoogleAuth.withAuthRetry(async () => {
                return await GoogleAuth.authenticatedFetch(
                    `${this.BASE_URL}/about?fields=user,storageQuota`,
                    {
                        method: 'GET'
                    }
                );
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Google Drive connected:', data.user.emailAddress);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Google Drive connection check failed:', error);
            return false;
        }
    }

    /**
     * Get storage quota information
     * @returns {Promise<Object>} Storage quota info
     */
    static async getStorageQuota() {
        const response = await GoogleAuth.withAuthRetry(async () => {
            return await GoogleAuth.authenticatedFetch(
                `${this.BASE_URL}/about?fields=storageQuota`,
                {
                    method: 'GET'
                }
            );
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get storage quota: ${error}`);
        }

        const data = await response.json();
        const quota = data.storageQuota;

        return {
            limit: parseInt(quota.limit),
            usage: parseInt(quota.usage),
            usageInDrive: parseInt(quota.usageInDrive),
            usageInDriveTrash: parseInt(quota.usageInDriveTrash),
            percentUsed: (parseInt(quota.usage) / parseInt(quota.limit)) * 100
        };
    }

    /**
     * Create structured folder system for app
     * @returns {Promise<Object>} Folder IDs
     */
    static async createStructuredFolder() {
        const appFolderId = await this.getOrCreateAppFolder();
        const imagesFolderId = await this.getOrCreateFolder('images', appFolderId);

        return {
            appFolderId,
            imagesFolderId
        };
    }

    /**
     * Get or create a folder
     * @param {string} folderName - Name of the folder
     * @param {string} parentId - Parent folder ID
     * @returns {Promise<string>} Folder ID
     */
    static async getOrCreateFolder(folderName, parentId = null) {
        // Search for existing folder
        const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId || 'root'}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        if (response.files && response.files.length > 0) {
            // Folder exists, return its ID
            console.log(`Using existing folder: ${folderName} (${response.files[0].id})`);
            return response.files[0].id;
        }

        // Create new folder
        const folder = await this.createFolder(folderName, parentId);
        return folder.id;
    }

    /**
     * Upload metadata.json to Drive
     * @param {Object} metadata - Metadata object
     * @returns {Promise<Object>} File metadata
     */
    static async uploadMetadata(metadata) {
        const appFolderId = await this.getOrCreateAppFolder();
        const fileName = 'metadata.json';

        // Check if metadata file exists
        const query = `name = '${fileName}' and '${appFolderId}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        const content = JSON.stringify(metadata, null, 2);

        if (response.files && response.files.length > 0) {
            // Update existing metadata file
            const fileId = response.files[0].id;
            console.log(`Updating metadata file: ${fileId}`);
            return await this.updateFile(fileId, content, 'application/json');
        } else {
            // Create new metadata file
            console.log('Creating new metadata file');
            return await this.uploadFile(fileName, content, 'application/json', appFolderId);
        }
    }

    /**
     * Download metadata.json from Drive
     * @returns {Promise<Object|null>} Metadata object or null
     */
    static async downloadMetadata() {
        const appFolderId = await this.getOrCreateAppFolder();
        const fileName = 'metadata.json';

        // Search for metadata file
        const query = `name = '${fileName}' and '${appFolderId}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        if (!response.files || response.files.length === 0) {
            console.log('No metadata file found');
            return null;
        }

        const fileId = response.files[0].id;
        const content = await this.getFile(fileId, true);

        try {
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to parse metadata:', error);
            return null;
        }
    }

    /**
     * Upload an image to the images folder
     * @param {string|number} id - Series ID
     * @param {Blob} imageBlob - Image as Blob
     * @param {string} fileName - Optional custom filename
     * @returns {Promise<Object>} File metadata
     */
    static async uploadImage(id, imageBlob, fileName = null) {
        const {imagesFolderId} = await this.createStructuredFolder();

        // Determine filename and mime type
        if (!fileName) {
            const mimeType = imageBlob.type || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            fileName = `${id}.${extension}`;
        }

        // Check if image already exists
        const query = `name contains '${id}.' and '${imagesFolderId}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        if (response.files && response.files.length > 0) {
            // Update existing image
            const fileId = response.files[0].id;
            console.log(`Updating image: ${fileName} (${fileId})`);
            return await this.updateFile(fileId, imageBlob, imageBlob.type);
        } else {
            // Upload new image
            console.log(`Uploading new image: ${fileName}`);
            return await this.uploadFile(fileName, imageBlob, imageBlob.type, imagesFolderId);
        }
    }

    /**
     * Download an image from the images folder
     * @param {string|number} id - Series ID
     * @returns {Promise<string|null>} Base64 encoded image or null
     */
    static async downloadImage(id) {
        const {imagesFolderId} = await this.createStructuredFolder();

        // Search for image file
        const query = `name contains '${id}.' and '${imagesFolderId}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        if (!response.files || response.files.length === 0) {
            console.log(`No image found for series ${id}`);
            return null;
        }

        const file = response.files[0];
        const fileId = file.id;

        // Download as blob
        const blob = await this.getFile(fileId, false);

        // Convert to base64
        const base64 = await this.blobToBase64(blob);
        console.log(`Downloaded image for series ${id}`);

        return base64;
    }

    /**
     * Delete an image from the images folder
     * @param {string|number} id - Series ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    static async deleteImage(id) {
        const fileId = await this.getImageFileId(id);

        if (!fileId) {
            console.log(`No image found for series ${id}`);
            return false;
        }

        await this.deleteFile(fileId);
        console.log(`Deleted image for series ${id}`);
        return true;
    }

    /**
     * Get image file ID by series ID
     * @param {string|number} id - Series ID
     * @returns {Promise<string|null>} File ID or null
     */
    static async getImageFileId(id) {
        const {imagesFolderId} = await this.createStructuredFolder();

        // Search for image file
        const query = `name contains '${id}.' and '${imagesFolderId}' in parents and trashed = false`;
        const response = await this.listFiles(query);

        if (!response.files || response.files.length === 0) {
            return null;
        }

        return response.files[0].id;
    }

    /**
     * List all images in the images folder
     * @returns {Promise<Array>} Array of file metadata
     */
    static async listImages() {
        const {imagesFolderId} = await this.createStructuredFolder();

        const allImages = [];
        let pageToken = null;

        do {
            const query = `'${imagesFolderId}' in parents and trashed = false and mimeType contains 'image/'`;
            const response = await this.listFiles(query, 100, pageToken);

            if (response.files) {
                allImages.push(...response.files);
            }

            pageToken = response.nextPageToken;
        } while (pageToken);

        console.log(`Found ${allImages.length} images in Drive`);
        return allImages;
    }

    /**
     * Check if structured storage exists
     * @returns {Promise<boolean>} True if structured storage exists
     */
    static async hasStructuredStorage() {
        try {
            const metadata = await this.downloadMetadata();
            return metadata !== null;
        } catch (error) {
            console.error('Failed to check structured storage:', error);
            return false;
        }
    }

    /**
     * Get total size of all images
     * @returns {Promise<number>} Total size in bytes
     */
    static async getImagesSize() {
        const images = await this.listImages();
        let totalSize = 0;

        for (const image of images) {
            totalSize += parseInt(image.size || 0);
        }

        return totalSize;
    }
}