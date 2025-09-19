import GoogleAuth from './googleAuth.js';

export default class GoogleDrive {

    static BASE_URL = 'https://www.googleapis.com/drive/v3';
    static UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
    static APP_SPACE = 'appDataFolder';
    static MANIFEST_NAME = 'savingseries.manifest.json';
    static DEFAULT_FIELDS = 'id,name,mimeType,modifiedTime,size,createdTime';
    static BOUNDARY = 'savingseries-google-drive-boundary';

    static async request(url, options = {}) {
        const response = await GoogleAuth.withAuthRetry(() => GoogleAuth.authenticatedFetch(url, options));

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Google Drive request failed with status ${response.status}`);
        }

        return response;
    }

    static escapeQueryValue(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    static async listAppDataFiles(query = null, pageSize = 100, pageToken = null) {
        const params = new URLSearchParams({
            spaces: this.APP_SPACE,
            pageSize: String(pageSize),
            fields: `nextPageToken,files(${this.DEFAULT_FIELDS})`
        });

        if (query) {
            params.append('q', query);
        }

        if (pageToken) {
            params.append('pageToken', pageToken);
        }

        const response = await this.request(`${this.BASE_URL}/files?${params.toString()}`, {method: 'GET'});
        return response.json();
    }

    static async findFilesByName(fileName) {
        const query = `name = '${this.escapeQueryValue(fileName)}' and trashed = false`;
        const allFiles = [];
        let pageToken = null;

        do {
            const response = await this.listAppDataFiles(query, 100, pageToken);
            allFiles.push(...(response.files || []));
            pageToken = response.nextPageToken;
        } while (pageToken);

        return allFiles;
    }

    static async getManifestFile() {
        const files = await this.findFilesByName(this.MANIFEST_NAME);
        if (files.length === 0) {
            return null;
        }

        files.sort((left, right) => new Date(right.modifiedTime) - new Date(left.modifiedTime));
        return files[0];
    }

    static async getFileContent(fileId, asText = true) {
        const response = await this.request(`${this.BASE_URL}/files/${fileId}?alt=media`, {method: 'GET'});
        return asText ? response.text() : response.blob();
    }

    static async deleteFile(fileId) {
        const response = await GoogleAuth.withAuthRetry(() => GoogleAuth.authenticatedFetch(`${this.BASE_URL}/files/${fileId}`, {
            method: 'DELETE'
        }));

        if (!response.ok && response.status !== 204) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to delete file from Google Drive.');
        }
    }

    static buildMultipartBody(metadata, content, mimeType) {
        return new Blob([
            `--${this.BOUNDARY}\r\n`,
            'Content-Type: application/json; charset=UTF-8\r\n\r\n',
            JSON.stringify(metadata),
            '\r\n',
            `--${this.BOUNDARY}\r\n`,
            `Content-Type: ${mimeType}\r\n\r\n`,
            content,
            '\r\n',
            `--${this.BOUNDARY}--`
        ]);
    }

    static async uploadMultipart(metadata, content, mimeType) {
        const response = await this.request(`${this.UPLOAD_URL}/files?uploadType=multipart&fields=${this.DEFAULT_FIELDS}`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/related; boundary=${this.BOUNDARY}`
            },
            body: this.buildMultipartBody(metadata, content, mimeType)
        });

        return response.json();
    }

    static async updateMultipart(fileId, metadata, content, mimeType) {
        const response = await this.request(`${this.UPLOAD_URL}/files/${fileId}?uploadType=multipart&fields=${this.DEFAULT_FIELDS}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': `multipart/related; boundary=${this.BOUNDARY}`
            },
            body: this.buildMultipartBody(metadata, content, mimeType)
        });

        return response.json();
    }

    static async uploadJsonFile(fileName, data) {
        const content = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        return this.uploadMultipart({
            name: fileName,
            parents: [this.APP_SPACE],
            mimeType: 'application/json'
        }, content, 'application/json');
    }

    static async updateJsonFile(fileId, fileName, data) {
        const content = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        return this.updateMultipart(fileId, {
            name: fileName,
            mimeType: 'application/json'
        }, content, 'application/json');
    }

    static async saveManifest(manifest) {
        const existingManifest = await this.getManifestFile();

        if (existingManifest) {
            return this.updateJsonFile(existingManifest.id, this.MANIFEST_NAME, manifest);
        }

        return this.uploadJsonFile(this.MANIFEST_NAME, manifest);
    }

    static async downloadManifest() {
        const manifestFile = await this.getManifestFile();

        if (!manifestFile) {
            return null;
        }

        const content = await this.getFileContent(manifestFile.id, true);

        try {
            return {
                file: manifestFile,
                data: JSON.parse(content)
            };
        } catch (error) {
            throw new Error(`Failed to parse Google Drive manifest: ${error.message}`);
        }
    }

    static getExtensionFromMimeType(mimeType) {
        const map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        };

        return map[mimeType] || 'bin';
    }

    static async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    static async dataUrlToBlob(dataUrl) {
        const response = await fetch(dataUrl);
        return response.blob();
    }

    static async uploadImage(seriesId, imageData, existingFileId = null) {
        const imageBlob = imageData instanceof Blob ? imageData : await this.dataUrlToBlob(imageData);
        const mimeType = imageBlob.type || 'application/octet-stream';
        const extension = this.getExtensionFromMimeType(mimeType);
        const fileName = `${seriesId}.${extension}`;

        const metadata = {
            name: fileName,
            parents: [this.APP_SPACE],
            mimeType
        };

        const file = existingFileId
            ? await this.updateMultipart(existingFileId, metadata, imageBlob, mimeType)
            : await this.uploadMultipart(metadata, imageBlob, mimeType);

        return {
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType || mimeType,
            updatedAt: file.modifiedTime || new Date().toISOString()
        };
    }

    static async downloadImageAsDataUrl(fileId) {
        const blob = await this.getFileContent(fileId, false);
        return this.blobToDataUrl(blob);
    }

    static async checkConnection() {
        try {
            const response = await this.request(`${this.BASE_URL}/about?fields=user`, {method: 'GET'});
            const data = await response.json();

            return {
                connected: true,
                emailAddress: data.user?.emailAddress || ''
            };
        } catch (error) {
            return {
                connected: false,
                emailAddress: ''
            };
        }
    }
}
