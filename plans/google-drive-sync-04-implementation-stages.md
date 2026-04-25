# Google Drive Sync: Implementation Stages

## Stage 1: Local Sync Metadata

Objective: prepare local data for synchronization without Google integration.

Tasks:

- Increase IndexedDB version from `2` to `3`.
- Add `syncId`, `updatedAt`, `deletedAt`, `imageUpdatedAt`, `deviceId`, `rev` to series metadata.
- Add `sync_state` store.
- Add `sync_deleted` store.
- Generate and persist local `deviceId`.
- Update `Series.validate()` to preserve sync fields.
- Update `AddingFullItem.add()` to create sync metadata.
- Update `Database.putSeriesInDb()` to bump `updatedAt` and `rev`.
- Update `Database.deleteSeriesFromDb()` to create tombstones.

Acceptance criteria:

- Existing data migrates successfully.
- Existing UI works unchanged.
- New records receive `syncId`.
- Updates change `updatedAt`.
- Deletes create tombstones.

## Stage 2: Local Export Format

Objective: make local app able to produce and consume the future cloud state format.

Tasks:

- Create `SyncRepository`.
- Implement `getLocalState()`.
- Implement `applyMergedState()`.
- Include selected localStorage settings.
- Add unit-like manual test helpers if project does not have test framework.

Acceptance criteria:

- App can export state without images.
- App can import exported state into a clean IndexedDB.
- Local numeric IDs are regenerated safely.

## Stage 3: Google Login And Drive Client

Objective: authenticate user and read/write appDataFolder files.

Tasks:

- Add Google Identity Services loading strategy.
- Add `GoogleAuthService`.
- Add `GoogleDriveClient`.
- Implement file search by name in `appDataFolder`.
- Implement JSON file create, read, update.
- Store auth state and sync status locally.

Acceptance criteria:

- User can sign in.
- User can sign out.
- App can create `saving-series-state.json` in `appDataFolder`.
- App can read that file after reload and sign-in.

## Stage 4: Manual Light Sync

Objective: implement safe manual metadata sync.

Tasks:

- Create `SyncService`.
- Implement `syncNow()`.
- Download remote state.
- Merge local and remote metadata.
- Apply merged local changes.
- Upload merged remote state.
- Add menu button `Sync now`.
- Add visible sync status.

Acceptance criteria:

- Two browsers signed into the same Google account exchange series metadata.
- Adds, edits, and deletes sync both ways.
- Images are ignored or left local in this stage.
- UI clearly reports success or failure.

## Stage 5: Automatic Sync And Offline Handling

Objective: make sync feel automatic and reliable.

Tasks:

- Mark local changes as dirty.
- Debounce automatic sync after local writes.
- Sync on `online` event.
- Sync on window focus if last sync is stale.
- Add periodic sync interval.
- Handle token expiration.
- Keep app fully usable while offline.

Acceptance criteria:

- Local changes upload automatically after a short delay.
- Offline changes upload after network returns.
- Failed sync does not block local saves.
- Status shows `offline`, `syncing`, `synced`, or `error`.

## Stage 6: Progressive Image Sync

Objective: sync heavy image data without slowing startup.

Tasks:

- Create `ImageSyncQueue`.
- Add `saving-series-images-index.json` support.
- Convert changed images to static WebP.
- Upload changed images as separate raw `.webp` Drive files.
- Download remote WebP images by priority.
- Prioritize visible cards and opened full item.
- Limit concurrent image requests.
- Save downloaded images into `series_images`.

Acceptance criteria:

- Metadata appears before images.
- Images appear progressively.
- Synced images are stored in Google Drive as raw WebP files, not Base64 JSON.
- Opening a series prioritizes its image.
- Large image sets do not freeze the UI.

## Stage 7: Recovery And Hardening

Objective: make edge cases understandable and recoverable.

Tasks:

- Add manual `Upload local to Google Drive` action.
- Add manual `Download from Google Drive` action.
- Add confirmation dialogs for destructive recovery actions.
- Add conflict diagnostics.
- Add retry with exponential backoff.
- Add tombstone retention policy.
- Replace broad `localStorage.clear()` with targeted app-key cleanup.

Acceptance criteria:

- User can recover after accidental local data loss.
- User can replace bad cloud state with local state.
- Sync errors are understandable.
- App does not delete unrelated localStorage keys.
