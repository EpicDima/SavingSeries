# Google Drive Sync: Overview

## Goal

Implement reliable two-way synchronization of user data through Google Drive while keeping IndexedDB as the primary local storage.

The application must continue to work offline and must show local data immediately. Google Drive is used as a user-owned cloud backup and synchronization layer.

## Current Project State

The current app stores user data locally only.

- Main data is stored in IndexedDB database `SavingSeries`.
- Metadata is stored in `series_meta`.
- Images are stored separately in `series_images`.
- UI settings are stored in `localStorage`.
- Manual file backup exists in `src/js/backup.js`.
- There is no remote sync layer.
- Images are already separated from metadata, which is useful for progressive sync.

## Target Behavior

- User signs in with Google explicitly.
- App stores cloud data in Google Drive `appDataFolder`.
- App starts from local IndexedDB first.
- Light data syncs first: series metadata, deletion markers, settings.
- Heavy data syncs later: images.
- Local changes are saved immediately and uploaded in the background.
- User can run manual sync.
- App handles offline mode without blocking normal usage.
- App exposes clear sync status in the UI.

## Recommended Google API Scope

Use only:

```text
https://www.googleapis.com/auth/drive.appdata
```

This limits access to the app-specific hidden Drive storage and avoids requesting access to the user's whole Drive.

## High-Level Components

- `Database`: low-level IndexedDB storage.
- `SyncRepository`: local sync-aware data access over IndexedDB and localStorage.
- `GoogleAuthService`: Google Identity Services login and token lifecycle.
- `GoogleDriveClient`: Drive REST API wrapper for `appDataFolder`.
- `SyncService`: orchestration of pull, merge, push, retry, and status.
- `ImageSyncQueue`: progressive image upload/download queue.
- `SyncStatusView` or menu integration: user-visible status and actions.

## Non-Goals For First Release

- No collaborative real-time sync.
- No Google Drive picker.
- No access to normal Google Drive files.
- No complex per-field conflict UI in the first implementation.
- No server-side backend.

## Implementation Strategy

Implement in stages.

1. Prepare local data model for sync.
2. Add Google login and Drive client.
3. Implement light-data manual sync.
4. Add automatic sync and offline queue.
5. Add progressive image sync.
6. Add recovery tools and hardening.
