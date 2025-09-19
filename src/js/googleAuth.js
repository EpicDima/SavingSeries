import LocalStorage from './localStorage.js';
import {GOOGLE_CLIENT_ID} from './config.js';

/**
 * Google OAuth Authentication Module
 * Implements OAuth 2.0 authorization code flow using Google Identity Services
 * Manages access tokens, refresh tokens, and automatic token renewal
 */
export default class GoogleAuth {

    static STORAGE_KEY = 'google_auth';
    static TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
    static REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
    static SCOPES = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata'
    ];

    // Token refresh buffer (5 minutes before expiry)
    static REFRESH_BUFFER = 5 * 60 * 1000;

    static localStorage = new LocalStorage();
    static tokenClient = null;
    static initPromise = null;
    static refreshInProgress = null;

    /**
     * Initialize Google Identity Services
     * @returns {Promise<void>}
     */
    static async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            // Check if Google Identity Services script is loaded
            if (!window.google || !window.google.accounts) {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => this.setupTokenClient(resolve, reject);
                script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
                document.head.appendChild(script);
            } else {
                this.setupTokenClient(resolve, reject);
            }
        });

        return this.initPromise;
    }

    /**
     * Setup the Google token client
     * @private
     */
    static setupTokenClient(resolve, reject) {
        try {
            // Diagnostic: Check if Client ID is configured
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE')) {
                const error = new Error('Google Client ID not configured. Please update src/js/config.js with your actual Client ID.');
                console.error('🔴 Configuration Error:', error.message);
                reject(error);
                return;
            }

            console.log('🔍 Initializing with Client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');

            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: this.SCOPES.join(' '),
                callback: (response) => {
                    this.handleAuthResponse(response);
                },
                error_callback: (error) => {
                    console.error('🔴 Google Auth Error:', error);
                    // Store error for proper handling in login method
                    this.lastAuthError = error;
                }
            });

            console.log('Google Identity Services initialized');
            resolve();
        } catch (error) {
            console.error('Failed to initialize Google Identity Services:', error);
            reject(error);
        }
    }

    /**
     * Handle authentication response from Google
     * @private
     */
    static async handleAuthResponse(response) {
        if (response.error) {
            console.error('Authentication failed:', response.error);
            throw new Error(`Authentication failed: ${response.error}`);
        }

        if (response.access_token) {
            // Store the token data
            const tokenData = {
                access_token: response.access_token,
                expires_at: Date.now() + (response.expires_in * 1000),
                scope: response.scope,
                token_type: response.token_type || 'Bearer'
            };

            // Note: Google Identity Services doesn't provide refresh tokens in implicit flow
            // For refresh tokens, we would need to use the authorization code flow
            // which requires a backend server

            this.localStorage.setByKey(this.STORAGE_KEY, tokenData);
            console.log('Access token stored successfully');
        }
    }

    /**
     * Start the OAuth login flow
     * @returns {Promise<void>}
     */
    static async login() {
        console.log('🔐 Starting Google OAuth login...');

        await this.init();

        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                const error = new Error('Token client not initialized');
                console.error('🔴', error.message);
                reject(error);
                return;
            }

            // Clear any previous auth errors
            this.lastAuthError = null;

            // Store original callbacks
            const originalCallback = this.tokenClient.callback;
            const originalErrorCallback = this.tokenClient.error_callback;

            // Track if authentication completed
            let authCompleted = false;
            let authTimeout;

            // Setup timeout to detect if popup was closed without authentication
            authTimeout = setTimeout(() => {
                if (!authCompleted) {
                    console.log('⏱️ Authentication timeout - popup may have been closed');

                    // Restore original callbacks
                    this.tokenClient.callback = originalCallback;
                    this.tokenClient.error_callback = originalErrorCallback;

                    // Check if we had an auth error
                    if (this.lastAuthError) {
                        if (this.lastAuthError.type === 'popup_closed') {
                            reject(new Error('Authentication canceled: Popup window was closed before completing sign-in'));
                        } else {
                            reject(new Error(`Authentication failed: ${this.lastAuthError.type || this.lastAuthError}`));
                        }
                    } else {
                        reject(new Error('Authentication timed out or popup was closed'));
                    }
                }
            }, 60000); // 60 second timeout

            // Override success callback
            this.tokenClient.callback = async (response) => {
                authCompleted = true;
                clearTimeout(authTimeout);
                console.log('✅ Authentication response received');

                try {
                    await this.handleAuthResponse(response);
                    // Restore original callbacks
                    this.tokenClient.callback = originalCallback;
                    this.tokenClient.error_callback = originalErrorCallback;
                    resolve();
                } catch (error) {
                    this.tokenClient.callback = originalCallback;
                    this.tokenClient.error_callback = originalErrorCallback;
                    reject(error);
                }
            };

            // Override error callback to handle popup closure
            this.tokenClient.error_callback = (error) => {
                authCompleted = true;
                clearTimeout(authTimeout);
                console.error('🔴 Authentication error:', error);

                // Restore original callbacks
                this.tokenClient.callback = originalCallback;
                this.tokenClient.error_callback = originalErrorCallback;

                // Handle different error types
                if (error.type === 'popup_closed' || error.type === 'popup_blocked') {
                    reject(new Error('Authentication canceled: Popup window was closed or blocked. Please ensure popups are allowed for this site.'));
                } else if (error.type === 'invalid_client') {
                    reject(new Error('Invalid Google Client ID. Please check your configuration in src/js/config.js'));
                } else {
                    reject(new Error(`Authentication failed: ${error.message || error.type || 'Unknown error'}`));
                }
            };

            console.log('🔗 Opening OAuth popup window...');

            // Request access token
            try {
                this.tokenClient.requestAccessToken({
                    prompt: 'consent',
                    // Request offline access for refresh token (requires backend)
                    // access_type: 'offline' 
                });
            } catch (error) {
                clearTimeout(authTimeout);
                console.error('🔴 Failed to open OAuth popup:', error);

                // Restore original callbacks
                this.tokenClient.callback = originalCallback;
                this.tokenClient.error_callback = originalErrorCallback;

                reject(new Error(`Failed to open authentication popup: ${error.message}`));
            }
        });
    }

    /**
     * Logout and revoke access
     * @returns {Promise<void>}
     */
    static async logout() {
        const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

        if (tokenData && tokenData.access_token) {
            try {
                // Revoke the token
                await fetch(`${this.REVOKE_ENDPOINT}?token=${tokenData.access_token}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                console.log('Token revoked successfully');
            } catch (error) {
                console.error('Failed to revoke token:', error);
                // Continue with logout even if revocation fails
            }
        }

        // Clear stored token data
        this.localStorage.setByKey(this.STORAGE_KEY, null);
        console.log('Logged out successfully');
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    static isAuthenticated() {
        const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

        if (!tokenData || !tokenData.access_token) {
            return false;
        }

        // Check if token is not expired (with buffer)
        const now = Date.now();
        const expiresAt = tokenData.expires_at || 0;

        return expiresAt > (now + this.REFRESH_BUFFER);
    }

    /**
     * Get valid access token (refresh if needed)
     * @returns {Promise<string|null>}
     */
    static async getAccessToken() {
        const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

        if (!tokenData || !tokenData.access_token) {
            console.log('No access token available');
            return null;
        }

        const now = Date.now();
        const expiresAt = tokenData.expires_at || 0;

        // Check if token needs refresh
        if (expiresAt <= (now + this.REFRESH_BUFFER)) {
            console.log('Token expired or expiring soon, refreshing...');

            // Try to refresh the token
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                console.log('Failed to refresh token, user needs to re-authenticate');
                return null;
            }

            // Get the new token data
            const newTokenData = this.localStorage.getByKey(this.STORAGE_KEY);
            return newTokenData ? newTokenData.access_token : null;
        }

        return tokenData.access_token;
    }

    /**
     * Refresh the access token
     * Note: This requires a refresh token which is only available
     * with authorization code flow (requires backend server)
     * For now, this will request a new token from the user
     * @returns {Promise<boolean>}
     */
    static async refreshAccessToken() {
        // Prevent multiple simultaneous refresh attempts
        if (this.refreshInProgress) {
            return this.refreshInProgress;
        }

        this.refreshInProgress = new Promise(async (resolve) => {
            const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

            // Check if we have a refresh token (would require backend implementation)
            if (tokenData && tokenData.refresh_token) {
                try {
                    // This would be the proper refresh token flow
                    const response = await fetch(this.TOKEN_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            client_id: GOOGLE_CLIENT_ID,
                            grant_type: 'refresh_token',
                            refresh_token: tokenData.refresh_token
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();

                        // Update stored token data
                        const updatedTokenData = {
                            ...tokenData,
                            access_token: data.access_token,
                            expires_at: Date.now() + (data.expires_in * 1000),
                            token_type: data.token_type || 'Bearer'
                        };

                        // If a new refresh token is provided, update it
                        if (data.refresh_token) {
                            updatedTokenData.refresh_token = data.refresh_token;
                        }

                        this.localStorage.setByKey(this.STORAGE_KEY, updatedTokenData);
                        console.log('Token refreshed successfully');
                        resolve(true);
                    } else {
                        console.error('Failed to refresh token:', await response.text());
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    resolve(false);
                }
            } else {
                // Without refresh token, try silent re-authentication
                await this.init();

                if (!this.tokenClient) {
                    resolve(false);
                } else {
                    try {
                        // Request new access token silently
                        this.tokenClient.requestAccessToken({prompt: ''});

                        // Wait a bit for the response
                        await new Promise(r => setTimeout(r, 2000));

                        // Check if we got a new token
                        const newTokenData = this.localStorage.getByKey(this.STORAGE_KEY);
                        const hasValidToken = newTokenData &&
                            newTokenData.access_token &&
                            newTokenData.expires_at > Date.now();

                        resolve(hasValidToken);
                    } catch (error) {
                        console.error('Silent authentication failed:', error);
                        resolve(false);
                    }
                }
            }
        });

        const result = await this.refreshInProgress;
        this.refreshInProgress = null;
        return result;
    }

    /**
     * Get user info from the stored token
     * @returns {Object|null}
     */
    static getTokenInfo() {
        const tokenData = this.localStorage.getByKey(this.STORAGE_KEY);

        if (!tokenData) {
            return null;
        }

        return {
            hasToken: !!tokenData.access_token,
            expiresAt: tokenData.expires_at,
            isExpired: tokenData.expires_at ? tokenData.expires_at < Date.now() : true,
            scope: tokenData.scope,
            tokenType: tokenData.token_type
        };
    }

    /**
     * Set custom scopes for authorization
     * Must be called before login()
     * @param {Array<string>} scopes
     */
    static setScopes(scopes) {
        if (!Array.isArray(scopes)) {
            throw new Error('Scopes must be an array of strings');
        }
        this.SCOPES = scopes;

        // Reinitialize if token client exists
        if (this.tokenClient) {
            this.tokenClient = null;
            this.initPromise = null;
        }
    }

    /**
     * Make an authenticated request to Google APIs
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>}
     */
    static async authenticatedFetch(url, options = {}) {
        const accessToken = await this.getAccessToken();

        if (!accessToken) {
            throw new Error('No valid access token available');
        }

        // Add authorization header
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    /**
     * Handle authorization errors and retry with fresh token
     * @param {Function} requestFn - Function that makes the API request
     * @returns {Promise<any>}
     */
    static async withAuthRetry(requestFn) {
        try {
            // First attempt
            const response = await requestFn();

            // Check if token was invalid
            if (response.status === 401) {
                console.log('Token invalid, attempting refresh...');

                // Try to refresh token
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry the request with new token
                    return await requestFn();
                } else {
                    throw new Error('Failed to refresh token');
                }
            }

            return response;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
}