export default class GoogleDriveClient {
    static STATE_FILE_NAME = "saving-series-state.json";
    static DRIVE_API_URL = "https://www.googleapis.com/drive/v3";
    static DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";

    constructor(authService) {
        this.authService = authService;
    }


    async findAppDataFileByName(name) {
        const query = `name='${this.#escapeDriveQueryValue(name)}' and trashed=false`;
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            q: query,
            fields: "files(id,name,modifiedTime)",
            pageSize: "1"
        });
        const response = await this.#request(`${GoogleDriveClient.DRIVE_API_URL}/files?${params.toString()}`);
        const data = await response.json();
        return data.files?.[0] || null;
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
        return this.readJsonFile(file.id);
    }


    async createJsonFile(name, content) {
        const metadata = {
            name: name,
            parents: ["appDataFolder"]
        };
        const response = await this.#upload("POST", `${GoogleDriveClient.DRIVE_UPLOAD_URL}/files?uploadType=multipart`, metadata, content);
        return response.json();
    }


    async updateJsonFile(fileId, content) {
        const response = await this.#upload("PATCH", `${GoogleDriveClient.DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`, null, content);
        return response.json();
    }


    async createOrUpdateJsonFileByName(name, content) {
        const file = await this.findAppDataFileByName(name);
        if (file) {
            return this.updateJsonFile(file.id, content);
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
            throw new Error(`Google Drive request failed: ${response.status} ${await response.text()}`);
        }
        return response;
    }


    async #upload(method, url, metadata, content) {
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
            "Content-Type: application/json; charset=UTF-8",
            "",
            JSON.stringify(content),
            `--${delimiter}--`
        );

        return this.#request(url, {
            method: method,
            headers: {
                "Content-Type": `multipart/related; boundary=${delimiter}`
            },
            body: parts.join("\r\n")
        });
    }


    #escapeDriveQueryValue(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }
}
