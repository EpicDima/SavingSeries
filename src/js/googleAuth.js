import LocalStorage from './localStorage.js';
import {GOOGLE_CLIENT_ID, isGoogleDriveConfigured} from './config.js';

export default class GoogleAuth {

    static STORAGE_KEY = 'google_auth';
    static REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
    static SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];
    static REFRESH_BUFFER = 60 * 1000;

    static localStorage = new LocalStorage();
    static tokenClient = null;
    static initPromise = null;
    static pendingTokenRequest = null;

    static async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            if (!isGoogleDriveConfigured()) {
                reject(new Error('Google Client ID is not configured. Set VITE_GOOGLE_CLIENT_ID before using Google Drive.'));
                return;
            }

            const onReady = () => {
                try {
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: this.SCOPES.join(' '),
                        callback: (response) => this.handleTokenResponse(response),
                        error_callback: (error) => this.handleTokenError(error)
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                onReady();
                return;
            }

            const existingScript = document.querySelector('script[data-google-gsi="true"]');
            if (existingScript) {
                existingScript.addEventListener('load', onReady, {once: true});
                existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {once: true});
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.dataset.googleGsi = 'true';
            script.addEventListener('load', onReady, {once: true});
            script.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {once: true});
            document.head.append(script);
        });

        return this.initPromise;
    }

    static handleTokenResponse(response) {
        if (!this.pendingTokenRequest) {
            return;
        }

        const {resolve, reject, cleanup} = this.pendingTokenRequest;
        cleanup();

        if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
        }

        const tokenData = {
            access_token: response.access_token,
            expires_at: Date.now() + ((response.expires_in || 0) * 1000),
            scope: response.scope || this.SCOPES.join(' '),
            token_type: response.token_type || 'Bearer'
        };

        this.localStorage.setByKey(this.STORAGE_KEY, tokenData);
        resolve(tokenData);
    }

    static handleTokenError(error) {
        if (!this.pendingTokenRequest) {
            return;
        }

        const {reject, cleanup} = this.pendingTokenRequest;
        cleanup();

        if (error?.type === 'popup_closed') {
            reject(new Error('Authentication canceled: popup window was closed.'));
            return;
        }

        if (error?.type === 'popup_blocked') {
            reject(new Error('Authentication failed: popup window was blocked.'));
            return;
        }

        if (error?.type === 'invalid_client') {
            reject(new Error('Authentication failed: invalid Google Client ID.'));
            return;
        }

        reject(new Error(error?.message || error?.type || 'Authentication failed.'));
    }

    static async requestToken(prompt = 'consent') {
        await this.init();

        if (!this.tokenClient) {
            throw new Error('Google token client is not initialized.');
        }

        if (this.pendingTokenRequest) {
            throw new Error('Another Google authentication request is already in progress.');
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (!this.pendingTokenRequest) {
                    return;
                }

                const activeRequest = this.pendingTokenRequest;
                activeRequest.cleanup();
                reject(new Error('Authentication timed out. Please try again.'));
            }, 60000);

            this.pendingTokenRequest = {
                resolve,
                reject,
                cleanup: () => {
                    clearTimeout(timeoutId);
                    this.pendingTokenRequest = null;
                }
            };

            try {
                this.tokenClient.requestAccessToken({prompt});
            } catch (error) {
                const activeRequest = this.pendingTokenRequest;
                activeRequest?.cleanup();
                reject(new Error(`Failed to open authentication popup: ${error.message}`));
            }
        });
    }

    static async login() {
        await this.requestToken('consent');
    }

    static async reauthenticate() {
        await this.requestToken('');
    }

    static async logout() {
        const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

        if (tokenData?.access_token && window.google?.accounts?.oauth2?.revoke) {
            await new Promise((resolve) => {
                window.google.accounts.oauth2.revoke(tokenData.access_token, () => resolve());
            });
        } else if (tokenData?.access_token) {
            try {
                await fetch(`${this.REVOKE_ENDPOINT}?token=${tokenData.access_token}`, {method: 'POST'});
            } catch (error) {
                console.error('Failed to revoke token:', error);
            }
        }

        this.localStorage.setByKey(this.STORAGE_KEY, null);
    }

    static getTokenData() {
        return this.localStorage.getByKey(this.STORAGE_KEY);
    }

    static isAuthenticated() {
        const tokenData = this.getTokenData();

        if (!tokenData?.access_token) {
            return false;
        }

        return (tokenData.expires_at || 0) > (Date.now() + this.REFRESH_BUFFER);
    }

    static async getAccessToken() {
        const tokenData = this.getTokenData();

        if (!tokenData?.access_token) {
            return null;
        }

        if ((tokenData.expires_at || 0) <= (Date.now() + this.REFRESH_BUFFER)) {
            return null;
        }

        return tokenData.access_token;
    }

    static getTokenInfo() {
        const tokenData = this.getTokenData();

        if (!tokenData) {
            return null;
        }

        return {
            hasToken: !!tokenData.access_token,
            expiresAt: tokenData.expires_at,
            isExpired: (tokenData.expires_at || 0) <= Date.now(),
            scope: tokenData.scope,
            tokenType: tokenData.token_type
        };
    }

    static async authenticatedFetch(url, options = {}) {
        const accessToken = await this.getAccessToken();

        if (!accessToken) {
            throw new Error('No valid Google access token available. Please sign in again.');
        }

        const headers = {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    static async withAuthRetry(requestFn) {
        const response = await requestFn();

        if (response.status !== 401) {
            return response;
        }

        this.localStorage.setByKey(this.STORAGE_KEY, null);
        throw new Error('Google session expired. Please sign in again.');
    }
}
