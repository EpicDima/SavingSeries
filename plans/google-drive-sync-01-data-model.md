# Google Drive Sync: Data Model

## Core Principle

The current numeric `id` must remain local. It is not safe for cross-device sync because two devices can create the same numeric ID independently.

Add a globally unique `syncId` to every series and use it for synchronization.

## Series Fields

Each series metadata record should contain:

```js
{
    id: 1,
    syncId: "uuid",
    name: "Series name",
    season: 1,
    episode: 1,
    date: "2026-04-25",
    site: "",
    note: "",
    status: "run",
    updatedAt: 1777142400000,
    deletedAt: null,
    imageUpdatedAt: 1777142400000,
    deviceId: "uuid",
    rev: 1
}
```

## Field Meaning

- `id`: local UI and IndexedDB key. Existing code can keep using it.
- `syncId`: stable global ID used for merge across devices.
- `updatedAt`: timestamp of the last metadata change.
- `deletedAt`: timestamp of deletion. `null` means not deleted.
- `imageUpdatedAt`: timestamp of the last image change.
- `deviceId`: local browser installation ID that made the latest change.
- `rev`: local monotonically increasing record revision. Useful for dirty detection and diagnostics.

## Device ID

`deviceId` is generated locally by the app on first launch after sync support is installed.

Recommended generation:

```js
crypto.randomUUID()
```

Recommended storage:

- Preferred: IndexedDB `sync_state`, key `deviceId`.
- Acceptable fallback: localStorage key `savingSeries.deviceId`.

It is not a hardware identifier and must not be derived from browser fingerprinting. It is only a random installation ID used to understand which local app instance made a change.

If the user clears browser data, a new `deviceId` is generated. This is acceptable.

## IndexedDB Migration

Increase database version from `2` to `3`.

For existing records in `series_meta`:

- Generate `syncId` if missing.
- Set `updatedAt` to current timestamp if missing.
- Set `deletedAt` to `null` if missing.
- Set `imageUpdatedAt` to `updatedAt` if an image exists, otherwise `null`.
- Set `deviceId` to current local device ID.
- Set `rev` to `1` if missing.

## New Object Stores

Add `sync_state`:

```js
{
    key: "googleDrive",
    signedIn: false,
    lastSyncAt: null,
    lastPullAt: null,
    lastPushAt: null,
    lastError: null,
    status: "idle"
}
```

Add `sync_deleted`:

```js
{
    syncId: "uuid",
    deletedAt: 1777142400000,
    deviceId: "uuid"
}
```

Add optional `sync_dirty` if dirty tracking is not stored directly on records:

```js
{
    syncId: "uuid",
    type: "metadata",
    changedAt: 1777142400000
}
```

## Delete Semantics

Do not only remove deleted records from IndexedDB.

Deletion must also create a tombstone in `sync_deleted` so another device can receive the deletion.

Recommended behavior:

- Remove visible local series from `series_meta` and `series_images`.
- Add or update tombstone in `sync_deleted`.
- Upload tombstone during next sync.

Tombstones can be garbage-collected after a long retention period, for example 90 days, but not in the first version.

## Settings Data

The following localStorage data should be included in cloud state:

- `containers`
- `navbar`
- `preferredLanguage`

Current `LocalStorage.clear()` clears all localStorage. Before implementing sync recovery actions, replace this with targeted clearing of app-owned keys only.
