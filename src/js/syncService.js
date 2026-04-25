import GoogleDriveClient from "./googleDriveClient";
import SyncRepository from "./syncRepository";


export default class SyncService {
    static MAX_CONFLICT_RETRIES = 2;

    constructor(database, syncRepository, googleDriveClient) {
        this.database = database;
        this.syncRepository = syncRepository;
        this.googleDriveClient = googleDriveClient;
    }


    async syncNow() {
        const lock = await this.database.acquireSyncLock();
        if (!lock) {
            await this.database.updateGoogleDriveSyncState({status: "pending"});
            return null;
        }
        try {
            return await this.#syncWithConflictRetry();
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: navigator.onLine ? "error" : "offline", lastError: error.message});
            throw error;
        } finally {
            await this.database.releaseSyncLock(lock);
        }
    }


    async #syncWithConflictRetry() {
        for (let attempt = 0; attempt <= SyncService.MAX_CONFLICT_RETRIES; attempt++) {
            try {
                return await this.#syncOnce();
            } catch (error) {
                if (!GoogleDriveClient.isConflictError(error) || attempt === SyncService.MAX_CONFLICT_RETRIES) {
                    throw error;
                }
            }
        }
        return null;
    }


    async #syncOnce() {
        await this.database.updateGoogleDriveSyncState({status: "syncing", lastError: null});
        const syncState = await this.database.getGoogleDriveSyncState();
        const initialGeneration = await this.database.getLocalGeneration();

        const [localState, remoteFileState] = await Promise.all([
            this.syncRepository.getLocalState(),
            this.#readRemoteState(syncState.stateFileId)
        ]);
        const remoteState = remoteFileState?.content || this.#createEmptyState();
        const mergedState = this.#mergeStates(localState, remoteState);

        await this.syncRepository.applyMergedState(mergedState);
        const file = await this.#writeRemoteState(remoteFileState?.file, mergedState);

        const now = Date.now();
        await this.database.updateGoogleDriveSyncStateIfGeneration(initialGeneration, {
            signedIn: true,
            dirty: false,
            status: "metadata-synced",
            lastSyncAt: now,
            lastPullAt: now,
            lastPushAt: now,
            lastError: null,
            remoteUpdatedAt: mergedState.updatedAt,
            stateFileId: file.id
        }, {
            signedIn: true,
            dirty: true,
            status: "pending",
            lastSyncAt: now,
            lastPullAt: now,
            lastPushAt: now,
            lastError: null,
            remoteUpdatedAt: mergedState.updatedAt,
            stateFileId: file.id
        });

        return mergedState;
    }


    async syncAfterRemoteConflict() {
        await this.database.updateGoogleDriveSyncState({status: "pending"});
        return this.syncNow();
    }


    async #readRemoteState(stateFileId) {
        try {
            if (stateFileId) {
                return await this.googleDriveClient.readJsonFileById(stateFileId);
            }
        } catch (error) {
            console.warn("Stored Google Drive state file is unavailable, falling back to name lookup:", error);
        }
        return this.googleDriveClient.readJsonFileByName();
    }


    async #writeRemoteState(remoteFile, state) {
        if (remoteFile?.id) {
            return this.googleDriveClient.updateJsonFile(remoteFile.id, state, remoteFile.etag);
        }
        return this.googleDriveClient.createJsonFile(GoogleDriveClient.STATE_FILE_NAME, state);
    }


    #createEmptyState() {
        return {
            schemaVersion: SyncRepository.SCHEMA_VERSION,
            updatedAt: 0,
            series: [],
            deleted: [],
            settings: {}
        };
    }


    #mergeStates(localState, remoteState) {
        this.#validateState(localState);
        this.#validateState(remoteState);

        const localSeries = this.#mapBySyncId(localState.series);
        const remoteSeries = this.#mapBySyncId(remoteState.series);
        const localDeleted = this.#mapDeletedBySyncId(localState.deleted);
        const remoteDeleted = this.#mapDeletedBySyncId(remoteState.deleted);
        const syncIds = new Set([
            ...localSeries.keys(),
            ...remoteSeries.keys(),
            ...localDeleted.keys(),
            ...remoteDeleted.keys()
        ]);
        const series = [];
        const deleted = [];

        for (const syncId of syncIds) {
            const result = this.#mergeRecord({
                local: localSeries.get(syncId),
                remote: remoteSeries.get(syncId),
                localDeleted: localDeleted.get(syncId),
                remoteDeleted: remoteDeleted.get(syncId)
            });
            if (result?.type === "series") {
                series.push(result.value);
            } else if (result?.type === "deleted") {
                deleted.push(result.value);
            }
        }

        return {
            schemaVersion: SyncRepository.SCHEMA_VERSION,
            updatedAt: Date.now(),
            series: series.sort((left, right) => left.name.localeCompare(right.name)),
            deleted: deleted.sort((left, right) => String(left.syncId).localeCompare(String(right.syncId))),
            settings: {
                ...(remoteState.settings || {}),
                ...(localState.settings || {})
            }
        };
    }


    #validateState(state) {
        if (!state || state.schemaVersion !== SyncRepository.SCHEMA_VERSION || !Array.isArray(state.series)) {
            throw new Error("Unsupported sync state format");
        }
    }


    #mapBySyncId(items = []) {
        const map = new Map();
        for (const item of items) {
            if (item?.syncId) {
                map.set(item.syncId, item);
            }
        }
        return map;
    }


    #mapDeletedBySyncId(items = []) {
        const map = new Map();
        for (const item of items) {
            if (!item?.syncId || !item.deletedAt) {
                continue;
            }
            const existing = map.get(item.syncId);
            if (!existing || Number(item.deletedAt) > Number(existing.deletedAt || 0)) {
                map.set(item.syncId, item);
            }
        }
        return map;
    }


    #mergeRecord({local, remote, localDeleted, remoteDeleted}) {
        const active = this.#newestSeries(local, remote);
        const deleted = this.#newestDeleted(localDeleted, remoteDeleted);

        if (!active && deleted) {
            return {type: "deleted", value: {...deleted}};
        }
        if (!active) {
            return null;
        }
        if (deleted && Number(deleted.deletedAt) > Number(active.updatedAt || 0)) {
            return {type: "deleted", value: {...deleted}};
        }
        if (deleted && Number(deleted.deletedAt) === Number(active.updatedAt || 0)
            && this.#compareVersion(deleted, active, "deletedAt") > 0) {
            return {type: "deleted", value: {...deleted}};
        }

        return {
            type: "series",
            value: {
                ...active,
                imageUpdatedAt: this.#mergeImageUpdatedAt(local, remote, active)
            }
        };
    }


    #newestSeries(local, remote) {
        if (!local) {
            return remote ? {...remote} : null;
        }
        if (!remote) {
            return {...local};
        }
        if (this.#compareVersion(remote, local, "updatedAt") > 0) {
            return {...remote};
        }
        return {...local};
    }


    #newestDeleted(localDeleted, remoteDeleted) {
        if (!localDeleted) {
            return remoteDeleted || null;
        }
        if (!remoteDeleted) {
            return localDeleted;
        }
        return this.#compareVersion(remoteDeleted, localDeleted, "deletedAt") > 0 ? remoteDeleted : localDeleted;
    }


    #compareVersion(left, right, timestampKey) {
        const timestampDiff = Number(left?.[timestampKey] || 0) - Number(right?.[timestampKey] || 0);
        if (timestampDiff !== 0) {
            return timestampDiff;
        }
        const revDiff = Number(left?.rev || 0) - Number(right?.rev || 0);
        if (revDiff !== 0) {
            return revDiff;
        }
        return String(left?.deviceId || "").localeCompare(String(right?.deviceId || ""));
    }


    #mergeImageUpdatedAt(local, remote, active) {
        return Math.max(
            Number(local?.imageUpdatedAt || 0),
            Number(remote?.imageUpdatedAt || 0),
            Number(active.imageUpdatedAt || 0)
        ) || null;
    }
}
