import GoogleAuth from './googleAuth.js';
import GoogleDrive from './googleDrive.js';
import GoogleDriveSync from './googleDriveSync.js';
import AlertDialog from './alertDialog.js';
import Dialog from './dialog.js';
import {getByQuery, hideElement, showElement} from './common.js';

/**
 * Google Drive Integration Module
 * Bridges between the existing backup system and Google Drive functionality
 * Handles UI interactions, authentication, and sync operations
 */
export default class GoogleDriveIntegration {

    constructor(app) {
        this.app = app;
        this.dialog = null;
        this.isInitialized = false;
        this.syncInterval = null;
        this.autoSyncEnabled = false;
    }

    /**
     * Initialize Google Drive integration
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize Google Auth
            await GoogleAuth.init();

            // Check authentication status on load
            if (GoogleAuth.isAuthenticated()) {
                console.log('Google Drive: User is already authenticated');
                this.updateMenuVisibility(true);

                // Start auto-sync if enabled
                const syncEnabled = this.app.localStorage.getByKey('google_drive_auto_sync');
                if (syncEnabled) {
                    this.startAutoSync();
                }
            } else {
                this.updateMenuVisibility(false);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Google Drive integration:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Show the Google Drive authentication dialog
     * @returns {Promise<void>}
     */
    async showAuthDialog() {
        if (!this.dialog) {
            this.createDialog();
        }

        await this.updateDialogStatus();

        if (!this.dialog.dialog.parentElement) {
            getByQuery('body').append(this.dialog.dialog);
        }

        this.dialog.dialog.showModal();
    }

    /**
     * Create the authentication dialog
     */
    createDialog() {
        this.dialog = new Dialog('googleDriveDialogTemplate', {closeOnBackdropClick: true});

        // Get dialog elements
        this.dialogElements = {
            statusText: this.dialog.dialog.querySelector('.status-text'),
            statusConnected: this.dialog.dialog.querySelector('.status-text.connected'),
            statusNotConnected: this.dialog.dialog.querySelector('.status-text.not-connected'),
            userInfo: this.dialog.dialog.querySelector('.user-info'),
            userEmail: this.dialog.dialog.querySelector('.user-email'),
            loginButton: this.dialog.dialog.querySelector('.login-button'),
            logoutButton: this.dialog.dialog.querySelector('.logout-button'),
            syncButton: this.dialog.dialog.querySelector('.sync-button'),
            closeButton: this.dialog.dialog.querySelector('.close')
        };

        // Set up event listeners
        this.dialogElements.loginButton.onclick = () => this.handleLogin();
        this.dialogElements.logoutButton.onclick = () => this.handleLogout();
        this.dialogElements.syncButton.onclick = () => this.handleSync();
        this.dialogElements.closeButton.onclick = () => this.dialog.close();

        // Apply translations
        window.i18n.applyTo(this.dialog.dialog);
    }

    /**
     * Update dialog status based on authentication
     */
    async updateDialogStatus() {
        const isAuthenticated = GoogleAuth.isAuthenticated();

        if (isAuthenticated) {
            // Show connected status
            hideElement(this.dialogElements.statusNotConnected);
            showElement(this.dialogElements.statusConnected);
            hideElement(this.dialogElements.loginButton);
            showElement(this.dialogElements.logoutButton);
            showElement(this.dialogElements.syncButton);

            // Try to get user info
            try {
                const connected = await GoogleDrive.checkConnection();
                if (connected) {
                    // Note: The actual email would need to be retrieved from the Google API
                    // For now, we'll just show a generic connected message
                    showElement(this.dialogElements.userInfo);
                    this.dialogElements.userEmail.textContent = window.i18n.t('google_drive_connected');
                }
            } catch (error) {
                console.error('Failed to get user info:', error);
            }
        } else {
            // Show not connected status
            showElement(this.dialogElements.statusNotConnected);
            hideElement(this.dialogElements.statusConnected);
            showElement(this.dialogElements.loginButton);
            hideElement(this.dialogElements.logoutButton);
            hideElement(this.dialogElements.syncButton);
            hideElement(this.dialogElements.userInfo);
        }
    }

    /**
     * Handle login button click
     */
    async handleLogin() {
        try {
            // Show loading state
            this.dialogElements.loginButton.disabled = true;
            this.dialogElements.loginButton.textContent = window.i18n.t('loading') || 'Loading...';

            await GoogleAuth.login();

            // Check if login was successful
            if (GoogleAuth.isAuthenticated()) {
                // Update dialog status
                await this.updateDialogStatus();

                // Update menu visibility
                this.updateMenuVisibility(true);

                // Show success message
                const alert = new AlertDialog(window.i18n.t('google_drive_login_success') || 'Successfully connected to Google Drive!');
                await alert.open();
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('Login failed:', error);

            // Provide more helpful error messages based on the error type
            let errorMessage;

            if (error.message.includes('Client ID not configured')) {
                errorMessage = 'Google Drive is not configured. Please update the Client ID in src/js/config.js with your Google OAuth credentials. See GOOGLE_DRIVE_SETUP.md for instructions.';
            } else if (error.message.includes('popup was closed')) {
                errorMessage = 'Authentication was canceled. Please complete the sign-in process in the popup window.';
            } else if (error.message.includes('popup blocked')) {
                errorMessage = 'The authentication popup was blocked. Please allow popups for this site and try again.';
            } else if (error.message.includes('Invalid Google Client ID')) {
                errorMessage = 'Invalid Google Client ID. Please check your configuration in src/js/config.js';
            } else if (error.message.includes('timed out')) {
                errorMessage = 'Authentication timed out. Please try again and complete the sign-in within 60 seconds.';
            } else {
                errorMessage = window.i18n.t('google_drive_login_error') ||
                    `Failed to connect to Google Drive: ${error.message}`;
            }

            // Show error message
            const alert = new AlertDialog(errorMessage);
            await alert.open();
        } finally {
            // Reset button state
            this.dialogElements.loginButton.disabled = false;
            this.dialogElements.loginButton.textContent = window.i18n.t('google_drive_login') || 'Login to Google Drive';
        }
    }

    /**
     * Handle logout button click
     */
    async handleLogout() {
        try {
            // Confirm logout
            const confirmDialog = new AlertDialog(
                window.i18n.t('google_drive_logout_confirm') ||
                'Are you sure you want to disconnect from Google Drive?'
            );

            const confirmed = await confirmDialog.open();
            if (!confirmed) {
                return;
            }

            // Stop auto-sync if running
            this.stopAutoSync();

            // Perform logout
            await GoogleAuth.logout();

            // Update dialog status
            await this.updateDialogStatus();

            // Update menu visibility
            this.updateMenuVisibility(false);

            // Show success message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_logout_success') ||
                'Successfully disconnected from Google Drive'
            );
            await alert.open();
        } catch (error) {
            console.error('Logout failed:', error);

            // Show error message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_logout_error') ||
                `Failed to disconnect: ${error.message}`
            );
            await alert.open();
        }
    }

    /**
     * Handle sync button click
     */
    async handleSync() {
        await this.syncWithDrive();
    }

    /**
     * Backup current data to Google Drive using structured storage
     * @returns {Promise<void>}
     */
    async backupToDrive() {
        try {
            // Check authentication
            if (!GoogleAuth.isAuthenticated()) {
                const alert = new AlertDialog(
                    window.i18n.t('google_drive_not_authenticated') ||
                    'Please login to Google Drive first'
                );
                await alert.open();
                await this.showAuthDialog();
                return;
            }

            // Check if old format backup exists
            const hasOldBackup = await GoogleDriveSync.hasOldFormatBackup();
            const hasStructured = await GoogleDrive.hasStructuredStorage();

            if (hasOldBackup && !hasStructured) {
                // Migrate from old format
                const alert = new AlertDialog(
                    window.i18n.t('google_drive_migrating') ||
                    'Migrating to new storage format...'
                );
                const oldBackup = await GoogleDrive.getLatestBackup();
                if (oldBackup) {
                    await GoogleDriveSync.migrateFromOldFormat(oldBackup);
                }
            }

            // Get current series data
            const backupData = await this.app.backup.exportForDrive();

            // Fix: exportForDrive returns an array, but we need an object with series property
            const formattedBackupData = Array.isArray(backupData) ? {series: backupData} : backupData;

            if (!formattedBackupData || !formattedBackupData.series) {
                throw new Error('Failed to generate backup data');
            }

            // Use structured sync for backup
            await GoogleDriveSync.fullSync(formattedBackupData.series);

            // Also maintain backward compatibility - upload traditional backup
            const file = await GoogleDrive.uploadBackup(formattedBackupData);
            await GoogleDrive.cleanupOldBackups(2); // Keep fewer old-format backups

            // Show success message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_backup_success') ||
                `Backup successfully uploaded to Google Drive!`
            );
            await alert.open();

            console.log('Backup uploaded to Google Drive with structured storage');
        } catch (error) {
            console.error('Backup to Drive failed:', error);

            // Show error message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_backup_error') ||
                `Failed to backup to Google Drive: ${error.message}`
            );
            await alert.open();
        }
    }

    /**
     * Restore backup from Google Drive using structured storage
     * @returns {Promise<void>}
     */
    async restoreFromDrive() {
        try {
            // Check authentication
            if (!GoogleAuth.isAuthenticated()) {
                const alert = new AlertDialog(
                    window.i18n.t('google_drive_not_authenticated') ||
                    'Please login to Google Drive first'
                );
                await alert.open();
                await this.showAuthDialog();
                return;
            }

            // Confirm restoration
            const confirmDialog = new AlertDialog(
                window.i18n.t('google_drive_restore_confirm') ||
                'All existing data will be replaced with data from Google Drive. Continue?'
            );

            const confirmed = await confirmDialog.open();
            if (!confirmed) {
                return;
            }

            // Check if structured storage exists
            const hasStructured = await GoogleDrive.hasStructuredStorage();
            let restoredData = null;

            if (hasStructured) {
                // Use structured sync to get data
                const localData = await this.app.backup.exportForDrive();
                // Fix: exportForDrive returns an array, convert to expected format
                const formattedLocalData = Array.isArray(localData) ? {series: localData} : localData;
                restoredData = await GoogleDriveSync.fullSync(formattedLocalData.series || {});
            } else {
                // Fallback to old format
                const backupData = await GoogleDrive.getLatestBackup();

                if (!backupData) {
                    const alert = new AlertDialog(
                        window.i18n.t('google_drive_no_backups') ||
                        'No backups found in Google Drive'
                    );
                    await alert.open();
                    return;
                }

                // Check if old format needs migration
                if (backupData.series) {
                    // Migrate to new format
                    await GoogleDriveSync.migrateFromOldFormat(backupData);
                    // Get migrated data
                    restoredData = await GoogleDriveSync.fullSync({});
                } else {
                    // Import old format directly
                    await this.app.backup.importFromDriveData(backupData);
                    this.app.refresh();

                    const alert = new AlertDialog(
                        window.i18n.t('google_drive_restore_success') ||
                        'Successfully restored backup from Google Drive!'
                    );
                    await alert.open();
                    return;
                }
            }

            // Import the restored data
            // Debug: Check the actual structure of restoredData
            console.log('[DEBUG] restoredData structure:', {
                type: typeof restoredData,
                isArray: Array.isArray(restoredData),
                isObject: restoredData && typeof restoredData === 'object',
                keys: restoredData ? Object.keys(restoredData).slice(0, 5) : 'N/A',
                firstValue: restoredData ? Object.values(restoredData)[0] : 'N/A'
            });

            if (restoredData) {
                // Convert object to array since fullSync returns an object but importFromDriveData expects an array
                const seriesArray = Array.isArray(restoredData)
                    ? restoredData
                    : Object.values(restoredData);

                const backupFormat = {
                    version: 2,
                    timestamp: new Date().toISOString(),
                    series: seriesArray
                };
                console.log('[DEBUG] Sending to importFromDriveData:', {
                    type: typeof backupFormat,
                    isArray: Array.isArray(backupFormat),
                    keys: Object.keys(backupFormat),
                    seriesIsArray: Array.isArray(backupFormat.series),
                    seriesLength: Array.isArray(backupFormat.series) ? backupFormat.series.length : 'N/A'
                });
                await this.app.backup.importFromDriveData(backupFormat);
            }

            // Show success message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_restore_success') ||
                'Successfully restored backup from Google Drive!'
            );
            await alert.open();

            // Refresh the app
            this.app.refresh();
        } catch (error) {
            console.error('Restore from Drive failed:', error);

            // Show error message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_restore_error') ||
                `Failed to restore from Google Drive: ${error.message}`
            );
            await alert.open();
        }
    }

    /**
     * Perform two-way sync with Google Drive using structured storage
     * @returns {Promise<void>}
     */
    async syncWithDrive() {
        try {
            // Check authentication
            if (!GoogleAuth.isAuthenticated()) {
                const alert = new AlertDialog(
                    window.i18n.t('google_drive_not_authenticated') ||
                    'Please login to Google Drive first'
                );
                await alert.open();
                return;
            }

            // Get current local data
            const localBackup = await this.app.backup.exportForDrive();
            // Fix: exportForDrive returns an array, convert to expected format
            const formattedLocalBackup = Array.isArray(localBackup) ? {series: localBackup} : localBackup;

            if (!formattedLocalBackup || !formattedLocalBackup.series) {
                const alert = new AlertDialog(
                    window.i18n.t('google_drive_no_data') ||
                    'No data to sync'
                );
                await alert.open();
                return;
            }

            // Check if we need to migrate from old format
            const hasOldBackup = await GoogleDriveSync.hasOldFormatBackup();
            const hasStructured = await GoogleDrive.hasStructuredStorage();

            if (hasOldBackup && !hasStructured) {
                const oldBackup = await GoogleDrive.getLatestBackup();
                if (oldBackup) {
                    await GoogleDriveSync.migrateFromOldFormat(oldBackup);
                }
            }

            // Perform full sync with structured storage
            const syncedData = await GoogleDriveSync.fullSync(formattedLocalBackup.series);

            if (syncedData) {
                // Update local data with synced data
                const backupFormat = {
                    version: 2,
                    timestamp: new Date().toISOString(),
                    series: syncedData
                };
                await this.app.backup.importFromDriveData(backupFormat);
                this.app.refresh();
            }

            // Also maintain a traditional backup for backward compatibility
            await GoogleDrive.uploadBackup(formattedLocalBackup);
            await GoogleDrive.cleanupOldBackups(2);

            const alert = new AlertDialog(
                window.i18n.t('google_drive_sync_success') ||
                'Successfully synced with Google Drive!'
            );
            await alert.open();
        } catch (error) {
            console.error('Sync with Drive failed:', error);

            // Show error message
            const alert = new AlertDialog(
                window.i18n.t('google_drive_sync_error') ||
                `Failed to sync with Google Drive: ${error.message}`
            );
            await alert.open();
        }
    }

    /**
     * Perform incremental update for changed items
     * @param {Object} changes - Object with added, modified, and deleted items
     * @returns {Promise<void>}
     */
    async incrementalUpdate(changes) {
        try {
            // Check authentication
            if (!GoogleAuth.isAuthenticated()) {
                console.log('Not authenticated for incremental update');
                return;
            }

            // Check if structured storage exists
            const hasStructured = await GoogleDrive.hasStructuredStorage();

            if (!hasStructured) {
                // Fall back to full sync if no structured storage
                console.log('No structured storage, performing full sync');
                await this.syncWithDrive();
                return;
            }

            // Perform incremental sync
            await GoogleDriveSync.incrementalSync(changes);

            console.log('Incremental sync completed');
        } catch (error) {
            console.error('Incremental update failed:', error);
            // Silent fail for incremental updates to not disrupt user flow
        }
    }

    /**
     * Track a change for incremental sync
     * @param {string} type - Type of change: 'add', 'modify', 'delete'
     * @param {string|number} id - Series ID
     * @param {Object} data - Series data (for add/modify)
     */
    trackChange(type, id, data = null) {
        if (!GoogleAuth.isAuthenticated()) {
            return;
        }

        GoogleDriveSync.trackChange(type, id);

        // Optionally trigger immediate sync for important changes
        if (this.autoSyncEnabled) {
            // Debounce syncs to avoid too many API calls
            if (this.syncDebounceTimer) {
                clearTimeout(this.syncDebounceTimer);
            }

            this.syncDebounceTimer = setTimeout(() => {
                const pendingChanges = GoogleDriveSync.getPendingChanges();
                const changesObj = {};

                // Get the actual data for changes
                if (pendingChanges.added.length > 0) {
                    changesObj.added = {};
                    // Would need to get data from app
                }
                if (pendingChanges.modified.length > 0) {
                    changesObj.modified = {};
                    // Would need to get data from app
                }
                if (pendingChanges.deleted.length > 0) {
                    changesObj.deleted = pendingChanges.deleted;
                }

                this.incrementalUpdate(changesObj).catch(console.error);
            }, 5000); // Wait 5 seconds before syncing
        }
    }

    /**
     * Start automatic sync with Google Drive
     */
    startAutoSync() {
        if (this.syncInterval) {
            return; // Already running
        }

        // Save auto-sync preference
        this.app.localStorage.setByKey('google_drive_auto_sync', true);
        this.autoSyncEnabled = true;

        // Sync every 30 minutes
        const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

        // Perform initial sync
        this.syncWithDrive().catch(console.error);

        // Set up interval
        this.syncInterval = setInterval(() => {
            this.syncWithDrive().catch(console.error);
        }, SYNC_INTERVAL);

        console.log('Auto-sync with Google Drive enabled');
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // Save preference
        this.app.localStorage.setByKey('google_drive_auto_sync', false);
        this.autoSyncEnabled = false;

        console.log('Auto-sync with Google Drive disabled');
    }

    /**
     * Update menu item visibility based on authentication status
     * @param {boolean} isAuthenticated
     */
    updateMenuVisibility(isAuthenticated) {
        // Get menu items (they will be set by menu.js)
        const backupItem = document.getElementById('backupToGoogleDriveSubMenuItem');
        const restoreItem = document.getElementById('restoreFromGoogleDriveSubMenuItem');

        if (isAuthenticated) {
            // Show Drive-specific options when authenticated
            if (backupItem) showElement(backupItem);
            if (restoreItem) showElement(restoreItem);
        } else {
            // Hide Drive-specific options when not authenticated
            if (backupItem) hideElement(backupItem);
            if (restoreItem) hideElement(restoreItem);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAutoSync();

        if (this.dialog) {
            this.dialog.close();
            this.dialog = null;
        }
    }
}