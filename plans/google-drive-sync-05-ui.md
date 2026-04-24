# Google Drive Sync: UI Plan

## Menu Changes

Add a Google Drive sync section to the existing settings submenu.

Initial items:

```text
Google Drive: Not signed in
Sign in with Google
Sync now
Sign out
```

Hide unavailable actions depending on state.

## Status States

The UI must expose these states:

- `Not signed in`
- `Signing in...`
- `Syncing...`
- `Synced`
- `Local changes pending`
- `Offline`
- `Google Drive error`
- `Sign-in required`

## Navbar Indicator

Add a compact indicator near settings or inside the settings submenu.

Recommended text-only first version:

```text
Sync: Synced
```

Avoid icon-only status in the first implementation because localization and accessibility are easier with text.

## Manual Actions

Normal actions:

- `Sign in with Google`
- `Sync now`
- `Sign out`

Recovery actions:

- `Upload local data to Google Drive`
- `Download Google Drive data to this device`

Recovery actions must use confirmation dialogs.

## Dialog Text Requirements

Sign-in explanation:

```text
SavingSeries will store synchronization data in a private Google Drive app folder. The app will not access your regular Drive files.
```

Upload local warning:

```text
This will replace Google Drive sync data with the data from this device.
```

Download remote warning:

```text
This will replace local data on this device with data from Google Drive.
```

## i18n Keys

Add English and Russian translations for:

```text
sync_google_drive
sync_sign_in
sync_sign_out
sync_now
sync_status_not_signed_in
sync_status_signing_in
sync_status_syncing
sync_status_synced
sync_status_pending
sync_status_offline
sync_status_error
sync_status_sign_in_required
sync_upload_local
sync_download_remote
sync_upload_local_confirm
sync_download_remote_confirm
sync_google_drive_explanation
```

## Accessibility

- Buttons must be keyboard-accessible.
- Status must be text, not color-only.
- Error state should include a readable message.
- Long-running sync should not lock the whole page.
