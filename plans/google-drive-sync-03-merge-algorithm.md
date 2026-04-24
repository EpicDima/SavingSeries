# Google Drive Sync: Merge Algorithm

## Merge Key

Use `syncId` as the only synchronization key.

Never merge by local numeric `id`.

## First Version Conflict Policy

Use last-write-wins for metadata.

Use separate last-write-wins for image data.

This is simple, deterministic, and enough for the first implementation.

## Metadata Merge

For each `syncId` from local state and remote state:

If only local exists:

- Keep local.
- Upload it to remote on push.

If only remote exists:

- Insert remote locally.
- Generate a new local numeric `id`.

If both exist and neither is deleted:

- Keep the record with larger `updatedAt`.

If local is deleted and remote is not:

- If `local.deletedAt > remote.updatedAt`, delete remote.
- Otherwise restore or keep remote locally.

If remote is deleted and local is not:

- If `remote.deletedAt > local.updatedAt`, delete local.
- Otherwise keep local and upload it again.

If both are deleted:

- Keep the larger `deletedAt` tombstone.

## Image Merge

Images are merged independently from metadata.

For each `syncId`:

- If local `imageUpdatedAt` is greater than remote, upload local image.
- If remote `imageUpdatedAt` is greater than local, download remote image.
- If timestamps are equal, do nothing.

Metadata sync must not wait for all images.

## Clock Concerns

The first version uses local timestamps. This is acceptable for a personal app, but device clocks can differ.

Mitigation:

- Always set timestamps with `Date.now()`.
- Store `deviceId` for diagnostics.
- Later, add conflict UI when updates are close in time, for example within 30 seconds from different `deviceId` values.

## Future Conflict UI

If a record changed on two devices close to the same time, show a dialog:

- Keep local version.
- Keep Google Drive version.
- Duplicate both versions.

This is not required for the first implementation.

## Merge Output

Each sync should produce:

- `mergedState`: final metadata and settings.
- `localChangesToApply`: remote records that must be written to IndexedDB.
- `remoteChangesToPush`: local records that must be uploaded.
- `imagesToUpload`: image sync tasks.
- `imagesToDownload`: image sync tasks.

## UI Refresh Rule

After metadata merge changes local IndexedDB, refresh the app UI using the existing app refresh flow.

Avoid rebuilding the UI after every individual record. Apply records in batch, then refresh once.
