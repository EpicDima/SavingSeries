export default class GoogleDriveClient {
    static STATE_FILE_NAME = "saving-series-state.json";
    static IMAGES_INDEX_FILE_NAME = "saving-series-images-index.json";
    static IMAGE_MIME_TYPE = "image/webp";
    static DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
    static DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";

    constructor(authService) {
        this.authService = authService;
    }


    static isConflictError(error) {
        return error instanceof GoogleDriveError && error.status === 412;
    }


    async findAppDataFileByName(name) {
        const query = `name='${this.#escapeDriveQueryValue(name)}' and trashed=false`;
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            q: query,
            fields: "files(id,name,modifiedTime,version,etag)",
            orderBy: "modifiedTime desc",
            pageSize: "10"
        });
        const response = await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files?${params.toString()}`);
        const data = await response.json();
        if ((data.files || []).length > 1) {
            throw new Error(`Multiple Google Drive files named ${name} found: ${data.files.length}`);
        }
        return data.files?.[0] ? this.#withEtag(data.files[0]) : null;
    }


    async readJsonFile(fileId) {
        const response = await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files/${fileId}?alt=media`);
        return response.json();
    }


    async readJsonFileByName(name = GoogleDriveClient.STATE_FILE_NAME) {
        const file = await this.findAppDataFileByName(name);
        if (!file) {
            return null;
        }
        const content = await this.readJsonFile(file.id);
        return {file, content};
    }


    async readJsonFileById(fileId) {
        const [file, content] = await Promise.all([
            this.getFileMetadata(fileId),
            this.readJsonFile(fileId)
        ]);
        return {file, content};
    }


    async getFileMetadata(fileId) {
        const params = new URLSearchParams({fields: "id,name,modifiedTime,version,etag"});
        const response = await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files/${fileId}?${params.toString()}`);
        return this.#jsonWithEtag(response);
    }


    async createJsonFile(name, content) {
        const metadata = {
            name: name,
            mimeType: "application/json",
            parents: ["appDataFolder"]
        };
        const params = new URLSearchParams({uploadType: "multipart", fields: "id,name,modifiedTime,version,etag"});
        const response = await this.#upload("POST", `${GoogleDriveClient.DRIVE_UPLOAD_URL}/files?${params.toString()}`, metadata, content);
        return this.#jsonWithEtag(response);
    }


    async updateJsonFile(fileId, content, etag = null) {
        const params = new URLSearchParams({uploadType: "media", fields: "id,name,modifiedTime,version,etag"});
        const headers = {
            "Content-Type": "application/json; charset=UTF-8"
        };
        if (etag) {
            headers["If-Match"] = etag;
        }
        const response = await this.#request(`${GoogleDriveClient.DRIVE_UPLOAD_URL}/files/${fileId}?${params.toString()}`, {
            method: "PATCH",
            headers: headers,
            body: JSON.stringify(content)
        });
        return this.#jsonWithEtag(response);
    }


    async readBlobFile(fileId) {
        const response = await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files/${fileId}?alt=media`);
        return response.blob();
    }


    async createBlobFile(name, blob, mimeType = GoogleDriveClient.IMAGE_MIME_TYPE) {
        const metadata = {
            name: name,
            mimeType: mimeType,
            parents: ["appDataFolder"]
        };
        const params = new URLSearchParams({uploadType: "multipart", fields: "id,name,modifiedTime,version,etag,size"});
        const response = await this.#multipartUpload("POST", `${GoogleDriveClient.DRIVE_UPLOAD_URL}/files?${params.toString()}`,
            metadata, blob, mimeType);
        return this.#jsonWithEtag(response);
    }


    async updateBlobFile(fileId, blob, mimeType = GoogleDriveClient.IMAGE_MIME_TYPE, etag = null) {
        const params = new URLSearchParams({uploadType: "media", fields: "id,name,modifiedTime,version,etag,size"});
        const headers = {
            "Content-Type": mimeType
        };
        if (etag) {
            headers["If-Match"] = etag;
        }
        const response = await this.#request(`${GoogleDriveClient.DRIVE_UPLOAD_URL}/files/${fileId}?${params.toString()}`, {
            method: "PATCH",
            headers: headers,
            body: blob
        });
        return this.#jsonWithEtag(response);
    }


    async createOrUpdateBlobFileByName(name, blob, mimeType = GoogleDriveClient.IMAGE_MIME_TYPE, fileId = null) {
        if (fileId) {
            return this.updateBlobFile(fileId, blob, mimeType);
        }
        const file = await this.findAppDataFileByName(name);
        if (file) {
            return this.updateBlobFile(file.id, blob, mimeType, file.etag);
        }
        return this.createBlobFile(name, blob, mimeType);
    }


    async deleteFile(fileId) {
        await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files/${fileId}`, {method: "DELETE"});
    }


    async createOrUpdateJsonFileByName(name, content) {
        const file = await this.findAppDataFileByName(name);
        if (file) {
            return this.updateJsonFile(file.id, content, file.etag);
        }
        return this.createJsonFile(name, content);
    }


    async #request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${this.authService.getAccessToken()}`
            }
        });
        if (!response.ok) {
            throw new GoogleDriveError(response.status, await response.text(), response.headers.get("Retry-After"));
        }
        return response;
    }


    async #upload(method, url, metadata, content) {
        return this.#multipartUpload(method, url, metadata, JSON.stringify(content), "application/json; charset=UTF-8");
    }


    async #multipartUpload(method, url, metadata, content, contentType) {
        const delimiter = "----SavingSeriesDriveBoundary";
        const parts = [];
        if (metadata) {
            parts.push(
                `--${delimiter}`,
                "Content-Type: application/json; charset=UTF-8",
                "",
                JSON.stringify(metadata)
            );
        }
        parts.push(
            `--${delimiter}`,
            `Content-Type: ${contentType}`,
            "",
            content,
            `--${delimiter}--`
        );
        const bodyParts = [];
        for (const part of parts) {
            bodyParts.push(part, "\r\n");
        }

        return this.#request(url, {
            method: method,
            headers: {
                "Content-Type": `multipart/related; boundary=${delimiter}`
            },
            body: new Blob(bodyParts, {type: `multipart/related; boundary=${delimiter}`})
        });
    }


    #escapeDriveQueryValue(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }


    async #jsonWithEtag(response) {
        return this.#withEtag(await response.json(), response.headers.get("ETag"));
    }


    #withEtag(file, etag = null) {
        return {
            ...file,
            etag: etag || file.etag || null
        };
    }
}


export class GoogleDriveError extends Error {
    constructor(status, body, retryAfter = null) {
        super(`Google Drive request failed: ${status}`);
        this.name = "GoogleDriveError";
        this.status = status;
        this.body = body;
        this.retryAfter = retryAfter;
    }


    get isRetryable() {
        return this.status === 429 || this.status >= 500;
    }


    get isUnauthorized() {
        return this.status === 401;
    }
}
