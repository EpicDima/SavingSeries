import GoogleDriveClient from "./googleDriveClient";
import SyncRepository from "./syncRepository";


export default class SyncService {
    constructor(database, syncRepository, googleDriveClient) {
        this.database = database;
        this.syncRepository = syncRepository;
        this.googleDriveClient = googleDriveClient;
    }


    async syncNow() {
        try {
            await this.database.updateGoogleDriveSyncState({status: "syncing", lastError: null});

            const [localState, remoteState] = await Promise.all([
                this.syncRepository.getLocalState(),
                this.googleDriveClient.readJsonFileByName()
            ]);
            const mergedState = this.#mergeStates(localState, remoteState || this.#createEmptyState());

            await this.syncRepository.applyMergedState(mergedState);
            const file = await this.googleDriveClient.createOrUpdateJsonFileByName(
                GoogleDriveClient.STATE_FILE_NAME,
                mergedState
            );

            const now = Date.now();
            await this.database.updateGoogleDriveSyncState({
                signedIn: true,
                status: "synced",
                lastSyncAt: now,
                lastPullAt: now,
                lastPushAt: now,
                lastError: null,
                remoteUpdatedAt: mergedState.updatedAt,
                stateFileId: file.id
            });

            return mergedState;
        } catch (error) {
            await this.database.updateGoogleDriveSyncState({status: "error", lastError: error.message});
            throw error;
        }
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
        if (Number(remote.updatedAt || 0) > Number(local.updatedAt || 0)) {
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
        return Number(remoteDeleted.deletedAt || 0) > Number(localDeleted.deletedAt || 0) ? remoteDeleted : localDeleted;
    }


    #mergeImageUpdatedAt(local, remote, active) {
        return Math.max(
            Number(local?.imageUpdatedAt || 0),
            Number(remote?.imageUpdatedAt || 0),
            Number(active.imageUpdatedAt || 0)
        ) || null;
    }
}
