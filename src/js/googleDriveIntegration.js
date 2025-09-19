import GoogleAuth from './googleAuth.js';
import GoogleDrive from './googleDrive.js';
import AlertDialog from './alertDialog.js';
import Dialog from './dialog.js';
import {getByQuery, hideElement, showElement} from './common.js';
import Database from './database.js';
import GoogleDriveProgress from './googleDriveProgress.js';

export default class GoogleDriveIntegration {

    static OPERATION_STAGE = {
        IDLE: 'idle',
        AUTH: 'auth',
        BACKUP: 'backup',
        RESTORE: 'restore'
    };

    static IMAGE_CONCURRENCY = 4;

    constructor(app) {
        this.app = app;
        this.dialog = null;
        this.dialogElements = null;
        this.isInitialized = false;
        this.restoreQueue = [];
        this.restoreInProgress = false;
        this.progress = new GoogleDriveProgress();
        this.operationState = this.createIdleOperationState();
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            await GoogleAuth.init();
        } catch (error) {
            console.error('Failed to initialize Google Drive auth:', error);
        }

        this.updateMenuVisibility(GoogleAuth.isAuthenticated());
        this.isInitialized = true;
    }

    async showAuthDialog() {
        if (!this.dialog) {
            this.createDialog();
        }

        await this.updateDialogStatus();

        if (!this.dialog.dialog.parentElement) {
            getByQuery('body').append(this.dialog.dialog);
        }

        if (this.dialog.dialog.open) {
            if (!this.dialog.dialog.matches(':modal')) {
                this.dialog.dialog.close();
            } else {
                return;
            }
        }

        this.dialog.dialog.showModal();
    }

    createDialog() {
        this.dialog = new Dialog('googleDriveDialogTemplate', {closeOnBackdropClick: true});
        this.dialogElements = {
            statusConnected: this.dialog.dialog.querySelector('.status-text.connected'),
            statusNotConnected: this.dialog.dialog.querySelector('.status-text.not-connected'),
            userInfo: this.dialog.dialog.querySelector('.user-info'),
            userEmail: this.dialog.dialog.querySelector('.user-email'),
            loginButton: this.dialog.dialog.querySelector('.login-button'),
            logoutButton: this.dialog.dialog.querySelector('.logout-button'),
            closeButton: this.dialog.dialog.querySelector('.close')
        };

        this.dialogElements.loginButton.onclick = () => this.handleLogin();
        this.dialogElements.logoutButton.onclick = () => this.handleLogout();
        this.dialogElements.closeButton.onclick = () => this.dialog.close();

        window.i18n.applyTo(this.dialog.dialog);
    }

    async updateDialogStatus() {
        const isAuthenticated = GoogleAuth.isAuthenticated();

        if (!isAuthenticated) {
            showElement(this.dialogElements.statusNotConnected);
            hideElement(this.dialogElements.statusConnected);
            hideElement(this.dialogElements.userInfo);
            showElement(this.dialogElements.loginButton);
            hideElement(this.dialogElements.logoutButton);
            return;
        }

        hideElement(this.dialogElements.statusNotConnected);
        showElement(this.dialogElements.statusConnected);
        hideElement(this.dialogElements.loginButton);
        showElement(this.dialogElements.logoutButton);

        const connectionInfo = await GoogleDrive.checkConnection();

        if (connectionInfo.connected) {
            showElement(this.dialogElements.userInfo);
            this.dialogElements.userEmail.textContent = connectionInfo.emailAddress || window.i18n.t('google_drive_connected');
            return;
        }

        hideElement(this.dialogElements.userInfo);
    }

    async ensureAuthenticated(showDialog = true) {
        if (GoogleAuth.isAuthenticated()) {
            return true;
        }

        if (showDialog) {
            const alert = new AlertDialog(window.i18n.t('google_drive_not_authenticated'));
            await alert.open();
            await this.showAuthDialog();
        }

        return false;
    }

    async handleLogin() {
        try {
            this.setOperationState({
                stage: GoogleDriveIntegration.OPERATION_STAGE.AUTH,
                titleKey: 'google_drive_login',
                message: window.i18n.t('loading'),
                current: 0,
                total: 0,
                determinate: false,
                visible: true,
                progressVisible: true,
                summary: '',
                dismissible: false,
                tone: 'active'
            });
            this.setDialogBusyState(true, window.i18n.t('loading'));
            await GoogleAuth.login();
            this.updateMenuVisibility(true);
            await this.updateDialogStatus();
            this.resetOperationState();
            await new AlertDialog(window.i18n.t('google_drive_login_success')).open();
        } catch (error) {
            console.error('Google Drive login failed:', error);
            this.showCompletedState('google_drive_login_error', `${window.i18n.t('google_drive_login_error')}: ${error.message}`, 'error');
            await new AlertDialog(`${window.i18n.t('google_drive_login_error')}: ${error.message}`).open();
        } finally {
            this.setDialogBusyState(false);
        }
    }

    async handleLogout() {
        const confirmed = await new AlertDialog(window.i18n.t('google_drive_logout_confirm')).open();
        if (!confirmed) {
            return;
        }

        try {
            await GoogleAuth.logout();
            this.updateMenuVisibility(false);
            await this.updateDialogStatus();
            this.resetOperationState();
            await new AlertDialog(window.i18n.t('google_drive_logout_success')).open();
        } catch (error) {
            console.error('Google Drive logout failed:', error);
            await new AlertDialog(`${window.i18n.t('google_drive_logout_error')}: ${error.message}`).open();
        }
    }

    setDialogBusyState(isBusy, text = null) {
        if (!this.dialogElements) {
            return;
        }

        this.dialogElements.loginButton.disabled = isBusy;
        this.dialogElements.logoutButton.disabled = isBusy;

        this.dialogElements.loginButton.textContent = isBusy && text
            ? text
            : window.i18n.t('google_drive_login');
    }

    createIdleOperationState() {
        return {
            stage: GoogleDriveIntegration.OPERATION_STAGE.IDLE,
            titleKey: 'google_drive_operation_idle',
            message: '',
            current: 0,
            total: 0,
            determinate: false,
            visible: false,
            progressVisible: false,
            summary: '',
            dismissible: false,
            tone: 'idle'
        };
    }

    setOperationState(partialState = {}) {
        this.operationState = {
            ...this.operationState,
            ...partialState
        };
        this.progress.setState(this.operationState);
    }

    resetOperationState() {
        this.operationState = this.createIdleOperationState();
        this.progress.reset();
    }

    showCompletedState(titleKey, message, tone = 'success', summary = '') {
        this.setOperationState({
            titleKey,
            message,
            summary,
            visible: true,
            progressVisible: false,
            dismissible: true,
            tone,
            determinate: false,
            current: 0,
            total: 0
        });
    }

    getProgressSummary(current, total, replacements = {}) {
        if (!total) {
            return '';
        }

        return window.i18n.t('google_drive_progress_counter', {
            current,
            total,
            ...replacements
        });
    }

    setBackupProgress(messageKey, current, total, replacements = {}, summaryReplacements = {}) {
        this.setOperationState({
            stage: GoogleDriveIntegration.OPERATION_STAGE.BACKUP,
            titleKey: 'google_drive_backup_in_progress',
            message: window.i18n.t(messageKey, replacements),
            current,
            total,
            determinate: total > 0,
            visible: true,
            progressVisible: true,
            summary: this.getProgressSummary(current, total, summaryReplacements),
            dismissible: false,
            tone: 'active'
        });
    }

    setRestoreProgress(messageKey, current, total, replacements = {}, summaryReplacements = {}) {
        this.setOperationState({
            stage: GoogleDriveIntegration.OPERATION_STAGE.RESTORE,
            titleKey: 'google_drive_restore_in_progress',
            message: window.i18n.t(messageKey, replacements),
            current,
            total,
            determinate: total > 0,
            visible: true,
            progressVisible: true,
            summary: this.getProgressSummary(current, total, summaryReplacements),
            dismissible: false,
            tone: 'active'
        });
    }

    async runParallelTasks(items, worker, concurrency = GoogleDriveIntegration.IMAGE_CONCURRENCY) {
        if (items.length === 0) {
            return [];
        }

        const limit = Math.max(1, Math.min(concurrency, items.length));
        const results = new Array(items.length);
        let nextIndex = 0;

        const runWorker = async () => {
            while (nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex += 1;
                results[currentIndex] = await worker(items[currentIndex], currentIndex);
            }
        };

        await Promise.all(Array.from({length: limit}, () => runWorker()));
        return results;
    }

    createManifest(localSeries, previousManifest = null) {
        return {
            schemaVersion: 1,
            appVersion: '2.0.0',
            updatedAt: new Date().toISOString(),
            deviceId: this.app.localStorage.getByKey('google_drive_device_id') || this.getOrCreateDeviceId(),
            series: localSeries.map((series) => {
                const previousSeries = previousManifest?.series?.find((item) => item.id === series.id);
                const {image, ...metadata} = series;

                return {
                    ...metadata,
                    ...(previousSeries?.image ? {image: previousSeries.image} : {})
                };
            })
        };
    }

    getOrCreateDeviceId() {
        let deviceId = this.app.localStorage.getByKey('google_drive_device_id');

        if (!deviceId) {
            deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            this.app.localStorage.setByKey('google_drive_device_id', deviceId);
        }

        return deviceId;
    }

    async backupToDrive() {
        try {
            const isAuthenticated = await this.ensureAuthenticated();
            if (!isAuthenticated) {
                this.resetOperationState();
                return;
            }

            this.setOperationState({
                stage: GoogleDriveIntegration.OPERATION_STAGE.BACKUP,
                titleKey: 'google_drive_backup_in_progress',
                message: window.i18n.t('google_drive_preparing_backup'),
                current: 0,
                total: 0,
                determinate: false,
                visible: true,
                progressVisible: true,
                summary: '',
                dismissible: false,
                tone: 'active'
            });

            const localSeries = await this.app.backup.exportForDrive();
            const seriesWithImages = localSeries.filter((series) => !!series.image);
            const remoteManifest = await GoogleDrive.downloadManifest();
            const manifest = this.createManifest(localSeries, remoteManifest?.data);
            const totalSteps = seriesWithImages.length + 1;
            let completedSteps = 0;

            this.setBackupProgress('google_drive_backup_metadata_prepared', completedSteps, totalSteps, {
                total: localSeries.length,
                images: seriesWithImages.length
            });

            const uploadNames = seriesWithImages.map((series) => series.name || `#${series.id}`);

            await this.runParallelTasks(seriesWithImages, async (series) => {
                const manifestSeries = manifest.series.find((item) => item.id === series.id);
                const existingFileId = remoteManifest?.data?.series?.find((item) => item.id === series.id)?.image?.fileId || null;
                manifestSeries.image = await GoogleDrive.uploadImage(series.id, series.image, existingFileId);
                completedSteps += 1;
                this.setBackupProgress('google_drive_backup_uploaded_image', completedSteps, totalSteps, {
                    name: series.name || `#${series.id}`,
                    latest: uploadNames.slice(Math.max(0, completedSteps - GoogleDriveIntegration.IMAGE_CONCURRENCY), completedSteps).join(', ')
                });
            });

            this.setBackupProgress('google_drive_backup_saving_manifest', completedSteps, totalSteps);
            await GoogleDrive.saveManifest(manifest);
            completedSteps += 1;
            this.setBackupProgress('google_drive_backup_manifest_saved', completedSteps, totalSteps);
            this.showCompletedState(
                'google_drive_backup_success',
                window.i18n.t('google_drive_backup_success'),
                'success',
                this.getProgressSummary(completedSteps, totalSteps)
            );
            if (this.dialog?.dialog?.open) {
                this.dialog.close();
            }
            await new AlertDialog(window.i18n.t('google_drive_backup_success')).open();
        } catch (error) {
            console.error('Backup to Drive failed:', error);
            this.showCompletedState('google_drive_backup_error', `${window.i18n.t('google_drive_backup_error')}: ${error.message}`, 'error');
            await new AlertDialog(`${window.i18n.t('google_drive_backup_error')}: ${error.message}`).open();
        }
    }

    async restoreFromDrive() {
        try {
            const isAuthenticated = await this.ensureAuthenticated();
            if (!isAuthenticated) {
                this.resetOperationState();
                return;
            }

            const confirmed = await new AlertDialog(window.i18n.t('google_drive_restore_confirm')).open();
            if (!confirmed) {
                this.resetOperationState();
                return;
            }

            this.setOperationState({
                stage: GoogleDriveIntegration.OPERATION_STAGE.RESTORE,
                titleKey: 'google_drive_restore_in_progress',
                message: window.i18n.t('google_drive_restore_loading_manifest'),
                current: 0,
                total: 0,
                determinate: false,
                visible: true,
                progressVisible: true,
                summary: '',
                dismissible: false,
                tone: 'active'
            });

            const remoteManifest = await GoogleDrive.downloadManifest();
            if (!remoteManifest?.data?.series?.length) {
                this.resetOperationState();
                await new AlertDialog(window.i18n.t('google_drive_no_backups')).open();
                return;
            }

            const metadataOnlySeries = remoteManifest.data.series.map((series) => {
                const normalizedSeries = {...series};
                delete normalizedSeries.image;
                return normalizedSeries;
            });

            this.setRestoreProgress('google_drive_restore_importing_metadata', 1, 2, {
                total: metadataOnlySeries.length
            });
            await this.app.backup.importFromDriveData({series: metadataOnlySeries});
            this.app.refresh();

            this.restoreQueue = remoteManifest.data.series
                .filter((series) => series.image?.fileId)
                .map((series) => ({
                    id: series.id,
                    name: series.name,
                    image: series.image
                }));

            const imageCount = this.restoreQueue.length;

            if (imageCount > 0) {
                this.setRestoreProgress('google_drive_restore_metadata_done', 0, imageCount, {
                    total: metadataOnlySeries.length,
                    images: imageCount
                }, {
                    unit: window.i18n.t('google_drive_images_suffix')
                });
            } else {
                this.showCompletedState(
                    'google_drive_restore_success',
                    window.i18n.t('google_drive_restore_complete_no_images', {
                        total: metadataOnlySeries.length
                    }),
                    'success'
                );
            }

            this.processRestoreQueue().catch((error) => {
                console.error('Background image restore failed:', error);
                this.showCompletedState('google_drive_restore_error', `${window.i18n.t('google_drive_restore_error')}: ${error.message}`, 'error');
            });

            if (this.dialog?.dialog?.open) {
                this.dialog.close();
            }

            await new AlertDialog(window.i18n.t('google_drive_restore_success')).open();
        } catch (error) {
            console.error('Restore from Drive failed:', error);
            this.showCompletedState('google_drive_restore_error', `${window.i18n.t('google_drive_restore_error')}: ${error.message}`, 'error');
            await new AlertDialog(`${window.i18n.t('google_drive_restore_error')}: ${error.message}`).open();
        }
    }

    async processRestoreQueue() {
        if (this.restoreInProgress) {
            return;
        }

        this.restoreInProgress = true;

        try {
            const queue = [...this.restoreQueue];
            const database = Database.getInstance();
            const totalImages = queue.length;
            let restoredImages = 0;

            this.setRestoreProgress('google_drive_restore_downloading_images_parallel', 0, totalImages, {
                count: totalImages,
                concurrency: Math.max(1, Math.min(GoogleDriveIntegration.IMAGE_CONCURRENCY, totalImages))
            }, {
                unit: window.i18n.t('google_drive_images_suffix')
            });

            await this.runParallelTasks(queue, async (nextImage) => {
                const dataUrl = await GoogleDrive.downloadImageAsDataUrl(nextImage.image.fileId);
                await new Promise((resolve, reject) => {
                    const request = database.getReadWriteObjectStore(Database.SERIES_IMAGES_OBJECT_STORE_NAME)
                        .put({id: nextImage.id, image: dataUrl});
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error || new Error('Failed to save restored image.'));
                });

                this.updateVisibleSeriesImage(nextImage.id, dataUrl);
                restoredImages += 1;
                this.setRestoreProgress('google_drive_restore_saved_image', restoredImages, totalImages, {
                    name: nextImage.name || `#${nextImage.id}`
                }, {
                    unit: window.i18n.t('google_drive_images_suffix')
                });
            });

            if (totalImages > 0) {
                this.showCompletedState(
                    'google_drive_restore_success',
                    window.i18n.t('google_drive_restore_images_complete', {
                        restored: restoredImages,
                        total: totalImages
                    }),
                    'success',
                    this.getProgressSummary(restoredImages, totalImages, {
                        unit: window.i18n.t('google_drive_images_suffix')
                    })
                );
            }
        } finally {
            this.restoreQueue = [];
            this.restoreInProgress = false;
        }
    }

    updateVisibleSeriesImage(seriesId, imageData) {
        for (const container of this.app.containers.values()) {
            const series = container.map.get(seriesId);
            if (!series) {
                continue;
            }

            series.data.image = imageData;
            series.image.style.backgroundImage = `url("${imageData}")`;
        }
    }

    updateMenuVisibility(isAuthenticated) {
        const backupItem = document.getElementById('backupToGoogleDriveSubMenuItem');
        const restoreItem = document.getElementById('restoreFromGoogleDriveSubMenuItem');

        if (isAuthenticated) {
            backupItem && showElement(backupItem);
            restoreItem && showElement(restoreItem);
            return;
        }

        backupItem && hideElement(backupItem);
        restoreItem && hideElement(restoreItem);
    }

    destroy() {
        this.restoreQueue = [];
        this.restoreInProgress = false;
        this.resetOperationState();

        if (this.dialog) {
            this.dialog.close();
            this.dialog = null;
        }
    }
}
