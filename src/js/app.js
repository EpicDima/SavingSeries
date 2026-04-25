import Database from "./database";
import {AddingFullItem} from "./fullitem";
import * as constants from "./constants";
import HorizontalContainer from "./container";
import {getByQuery, getSeriesListType} from "./common";
import Backup from "./backup";
import Series from "./series";
import {Menu} from "./menu";
import LocalStorage from "./localStorage";
import SyncRepository from "./syncRepository";
import GoogleAuthService from "./googleAuthService";
import GoogleDriveClient from "./googleDriveClient";
import SyncService from "./syncService";


export default class App {

    static AUTO_SYNC_DELAY = 3000;
    static FOCUS_SYNC_STALE_MS = 30 * 60 * 1000;

    database;

    static #instance;

    constructor() {
        this.database = Database.getInstance();
        this.containers = new Map();

        this.localStorage = new LocalStorage();
        this.syncRepository = new SyncRepository(this.database, this.localStorage);
        this.googleAuthService = new GoogleAuthService();
        this.googleDriveClient = new GoogleDriveClient(this.googleAuthService);
        this.syncService = new SyncService(this.database, this.syncRepository, this.googleDriveClient);
        this.autoSyncTimeout = null;
        this.syncInProgress = false;
        this.backup = new Backup(this.database, () => this.clearAll(), () => {
            this.clearRuntime();
            this.initialize();
        });

        Series.onItemClickListener = (id) => this.openFullitem(id);

        this.menu = new Menu(this);
        this.addingFullItem = new AddingFullItem((series) => this.relocateSeries(series), this.database);

        this.main = document.createElement("main");
        getByQuery("body").append(this.menu.getFragment(), this.main);

        this.onCreate();
    }


    static createApp() {
        if (!App.#instance) {
            App.#instance = new App();
        }
    }


    onCreate() {
        this.database.connect(() => this.initialize());
        this.setDayTimer();
        this.setSyncListeners();
        document.addEventListener("languagechange", () => {
            this.updateContainerTitles();
            this.database.getGoogleDriveSyncState()
                .then(state => this.menu.updateSyncStatus(state));
            for (const container of this.containers.values()) {
                for (const series of container.map.values()) {
                    series.retranslate();
                }
            }
        });
    }


    setSyncListeners() {
        window.addEventListener("savingseries:local-sync-dirty", () => this.scheduleAutoSync());
        window.addEventListener("online", () => this.handleOnline());
        window.addEventListener("offline", () => this.handleOffline());
        window.addEventListener("focus", () => this.syncIfStale());
    }


    initialize() {
        window.savingSeriesSync = {
            exportState: () => this.syncRepository.getLocalState(),
            importState: async (state) => {
                this.clearRuntime();
                await this.syncRepository.applyMergedState(state);
                this.initialize();
            },
            signIn: () => this.signInToGoogleDrive(),
            signOut: () => this.signOutFromGoogleDrive(),
            getGoogleDriveStatus: () => this.database.getGoogleDriveSyncState(),
            readRemoteState: () => this.readGoogleDriveState(),
            writeRemoteState: () => this.writeGoogleDriveState(),
            syncNow: () => this.syncNow(),
            isGoogleDriveConfigured: () => this.googleAuthService.isConfigured()
        };

        const fragment = new DocumentFragment();
        fragment.append(this.addingFullItem.getFragment());
        for (const k of Object.values(constants.LIST_TYPE)) {
            const container = new HorizontalContainer(k, constants.getListNames().get(k), this);
            this.containers.set(k, container);
            fragment.append(container.getFragment());
        }
        this.main.append(fragment);
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        this.database.getGoogleDriveSyncState()
            .then(state => {
                this.menu.updateSyncStatus(this.#withCurrentNetworkStatus(state));
                if (state.dirty) {
                    this.scheduleAutoSync();
                }
            });
        App.scrollToTop();
        window.i18n.applyTo(document.body);
    }


    refresh() {
        this.menu.clear();
        for (let container of this.containers.values()) {
            container.clear();
        }
        this.addingFullItem.close();
        this.database.foreach((series) => this.initialSplitSeries(series),
            (id) => this.onInitialSplitSeriesEnd(id));
        App.scrollToTop();
    }


    static scrollToTop() {
        window.scrollTo({top: 0, behavior: "smooth"});
    }


    clearAll() {
        this.clearRuntime();
        this.localStorage.clear();
        this.database.clear();
    }


    clearRuntime() {
        this.addingFullItem.remove();
        for (let container of this.containers.values()) {
            container.remove();
        }
        this.containers.clear();
    }


    setDayTimer() {
        let tomorrow = new Date();
        tomorrow.setHours(0, 0, 1);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setTimeout(() => {
            this.clearRuntime();
            this.initialize();
            this.setDayTimer();
        }, tomorrow - new Date());
    }


    openAddingElement() {
        this.addingFullItem.open();
    }


    openFullitem(id) {
        for (let container of this.containers.values()) {
            if (container.showFullItemIfExists(id)) {
                return;
            }
        }
    }


    initialSplitSeries(series) {
        series = Series.create(series);
        this.containers.get(getSeriesListType(series)).simplyAddSeries(series);
    }


    onInitialSplitSeriesEnd(id) {
        this.addingFullItem.setSeriesId(id + 1);
        for (let container of this.containers.values()) {
            container.initialAdditionFinish();
        }
    }


    relocateSeries(series, listType = null) {
        if (!listType) {
            listType = getSeriesListType(series);
        }
        this.containers.get(listType).addSeries(series);
    }


    onSearchItemClick(id) {
        document.activeElement.blur();
        this.openFullitem(id);
    }

    updateContainerTitles() {
        const listNames = constants.getListNames();
        for (const [id, container] of this.containers.entries()) {
            container.updateTitle(listNames.get(id));
        }
    }


    async signInToGoogleDrive() {
        try {
            if (!navigator.onLine) {
                throw new Error("Google Drive sync is offline");
            }
            this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "signing-in", lastError: null}));
            const response = await this.googleAuthService.signIn();
            const state = await this.database.updateGoogleDriveSyncState({
                signedIn: true,
                status: "signed-in",
                lastError: null,
                tokenExpiresAt: this.googleAuthService.expiresAt,
                scope: response.scope || GoogleAuthService.DRIVE_APPDATA_SCOPE
            });
            this.menu.updateSyncStatus(state);
            return state;
        } catch (error) {
            const state = await this.database.updateGoogleDriveSyncState({
                signedIn: false,
                status: navigator.onLine ? "error" : "offline",
                lastError: error.message
            });
            this.menu.updateSyncStatus(state);
            throw error;
        }
    }


    async signOutFromGoogleDrive() {
        this.googleAuthService.signOut();
        const state = await this.database.updateGoogleDriveSyncState({
            signedIn: false,
            status: "signed-out",
            lastError: null,
            tokenExpiresAt: null
        });
        this.menu.updateSyncStatus(state);
        return state;
    }


    async syncNow() {
        try {
            if (!navigator.onLine) {
                const state = await this.database.updateGoogleDriveSyncState({status: "offline"});
                this.menu.updateSyncStatus(state);
                return null;
            }
            if (this.syncInProgress) {
                return null;
            }
            this.syncInProgress = true;
            this.cancelScheduledAutoSync();
            if (!this.googleAuthService.isSignedIn()) {
                await this.signInToGoogleDrive();
            }
            this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "syncing", lastError: null}));
            const state = await this.syncService.syncNow();
            this.refresh();
            this.menu.updateSyncStatus(await this.database.getGoogleDriveSyncState());
            return state;
        } catch (error) {
            this.menu.updateSyncStatus(await this.database.getGoogleDriveSyncState());
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }


    scheduleAutoSync() {
        if (!navigator.onLine) {
            this.database.updateGoogleDriveSyncState({status: "offline"})
                .then(state => this.menu.updateSyncStatus(state));
            return;
        }
        clearTimeout(this.autoSyncTimeout);
        this.autoSyncTimeout = setTimeout(() => this.autoSync(), App.AUTO_SYNC_DELAY);
        this.database.updateGoogleDriveSyncState({status: "pending", lastError: null})
            .then(state => this.menu.updateSyncStatus(state));
    }


    cancelScheduledAutoSync() {
        clearTimeout(this.autoSyncTimeout);
        this.autoSyncTimeout = null;
    }


    async autoSync({allowStalePull = false} = {}) {
        if (!navigator.onLine || this.syncInProgress) {
            return;
        }

        const state = await this.database.getGoogleDriveSyncState();
        if (!this.googleAuthService.isSignedIn()) {
            if (state.dirty) {
                this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "sign-in-required"}));
            }
            return;
        }
        if (!state.dirty && (!allowStalePull || !this.#isSyncStale(state))) {
            return;
        }

        try {
            await this.syncNow();
        } catch (error) {
            console.error("Automatic Google Drive sync failed:", error);
        }
    }


    async handleOnline() {
        const state = await this.database.getGoogleDriveSyncState();
        this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: state.dirty ? "pending" : "idle"}));
        if (state.dirty) {
            this.scheduleAutoSync();
        }
    }


    async handleOffline() {
        this.cancelScheduledAutoSync();
        this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "offline"}));
    }


    async syncIfStale() {
        const state = await this.database.getGoogleDriveSyncState();
        if (state.dirty) {
            this.scheduleAutoSync();
            return;
        }
        if (document.visibilityState === "visible" && this.googleAuthService.isSignedIn() && this.#isSyncStale(state)) {
            await this.autoSync({allowStalePull: true});
        }
    }


    #isSyncStale(state) {
        return !state.lastSyncAt || Date.now() - Number(state.lastSyncAt) > App.FOCUS_SYNC_STALE_MS;
    }


    #withCurrentNetworkStatus(state) {
        if (!navigator.onLine && state.status !== "error") {
            return {...state, status: "offline"};
        }
        return state;
    }


    async readGoogleDriveState() {
        try {
            this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "reading", lastError: null}));
            const state = await this.googleDriveClient.readJsonFileByName();
            const update = {
                status: state ? "read" : "missing",
                lastPullAt: Date.now(),
                lastError: null
            };
            if (state) {
                update.remoteUpdatedAt = state.updatedAt || null;
            }
            await this.database.updateGoogleDriveSyncState({
                ...update
            });
            this.menu.updateSyncStatus(await this.database.getGoogleDriveSyncState());
            return state;
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: "error", lastError: error.message});
            this.menu.updateSyncStatus(await this.database.getGoogleDriveSyncState());
            throw error;
        }
    }


    async writeGoogleDriveState() {
        try {
            this.menu.updateSyncStatus(await this.database.updateGoogleDriveSyncState({status: "writing", lastError: null}));
            const state = await this.syncRepository.getLocalState();
            const file = await this.googleDriveClient.createOrUpdateJsonFileByName(GoogleDriveClient.STATE_FILE_NAME, state);
            const nextState = await this.database.updateGoogleDriveSyncState({
                status: "written",
                lastPushAt: Date.now(),
                lastSyncAt: Date.now(),
                lastError: null,
                stateFileId: file.id
            });
            this.menu.updateSyncStatus(nextState);
            return nextState;
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: "error", lastError: error.message});
            this.menu.updateSyncStatus(await this.database.getGoogleDriveSyncState());
            throw error;
        }
    }
}
