export default class GoogleAuthService {
    static CLIENT_SCRIPT_URL = "https://accounts.google.com/gsi/client";
    static DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

    constructor(clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        this.clientId = clientId;
        this.tokenClient = null;
        this.accessToken = null;
        this.expiresAt = null;
    }


    isConfigured() {
        return Boolean(this.clientId);
    }


    async signIn() {
        if (!this.clientId) {
            throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
        }

        await this.#loadGoogleIdentityServices();
        this.tokenClient = this.tokenClient || google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: GoogleAuthService.DRIVE_APPDATA_SCOPE,
            callback: () => {
            }
        });

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (response) => {
                if (response.error) {
                    reject(new Error(response.error_description || response.error));
                    return;
                }
                this.accessToken = response.access_token;
                this.expiresAt = Date.now() + Number(response.expires_in || 0) * 1000;
                resolve(response);
            };
            this.tokenClient.requestAccessToken({prompt: this.accessToken ? "" : "consent"});
        });
    }


    signOut() {
        const token = this.accessToken;
        this.accessToken = null;
        this.expiresAt = null;
        if (token && window.google?.accounts?.oauth2?.revoke) {
            google.accounts.oauth2.revoke(token, () => {
            });
        }
    }


    getAccessToken() {
        if (!this.accessToken) {
            throw new Error("Google Drive is not signed in");
        }
        return this.accessToken;
    }


    isSignedIn() {
        return Boolean(this.accessToken) && !this.isTokenExpired();
    }


    isTokenExpired() {
        return Boolean(this.expiresAt) && Date.now() >= this.expiresAt - 60000;
    }


    #loadGoogleIdentityServices() {
        if (window.google?.accounts?.oauth2) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${GoogleAuthService.CLIENT_SCRIPT_URL}"]`);
            if (existingScript) {
                existingScript.addEventListener("load", () => resolve(), {once: true});
                existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")), {once: true});
                return;
            }

            const script = document.createElement("script");
            script.src = GoogleAuthService.CLIENT_SCRIPT_URL;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
            document.head.append(script);
        });
    }
}
