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


export default class App {

    database;

    static #instance;

    constructor() {
        this.database = Database.getInstance();
        this.containers = new Map();

        this.localStorage = new LocalStorage();
        this.syncRepository = new SyncRepository(this.database, this.localStorage);
        this.googleAuthService = new GoogleAuthService();
        this.googleDriveClient = new GoogleDriveClient(this.googleAuthService);
        this.backup = new Backup(this.database, () => this.clearAll(), () => this.initialize());

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
        document.addEventListener("languagechange", () => {
            this.updateContainerTitles();
            for (const container of this.containers.values()) {
                for (const series of container.map.values()) {
                    series.retranslate();
                }
            }
        });
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
            await this.database.updateGoogleDriveSyncState({status: "signing-in", lastError: null});
            const response = await this.googleAuthService.signIn();
            return this.database.updateGoogleDriveSyncState({
                signedIn: true,
                status: "signed-in",
                lastError: null,
                tokenExpiresAt: this.googleAuthService.expiresAt,
                scope: response.scope || GoogleAuthService.DRIVE_APPDATA_SCOPE
            });
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({
                signedIn: false,
                status: "error",
                lastError: error.message
            });
            throw error;
        }
    }


    async signOutFromGoogleDrive() {
        this.googleAuthService.signOut();
        return this.database.updateGoogleDriveSyncState({
            signedIn: false,
            status: "signed-out",
            lastError: null,
            tokenExpiresAt: null
        });
    }


    async readGoogleDriveState() {
        try {
            await this.database.updateGoogleDriveSyncState({status: "reading", lastError: null});
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
            return state;
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: "error", lastError: error.message});
            throw error;
        }
    }


    async writeGoogleDriveState() {
        try {
            await this.database.updateGoogleDriveSyncState({status: "writing", lastError: null});
            const state = await this.syncRepository.getLocalState();
            const file = await this.googleDriveClient.createOrUpdateJsonFileByName(GoogleDriveClient.STATE_FILE_NAME, state);
            return this.database.updateGoogleDriveSyncState({
                status: "written",
                lastPushAt: Date.now(),
                lastSyncAt: Date.now(),
                lastError: null,
                stateFileId: file.id
            });
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: "error", lastError: error.message});
            throw error;
        }
    }
}
