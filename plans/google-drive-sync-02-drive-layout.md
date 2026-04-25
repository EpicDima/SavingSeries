# Google Drive Sync: Drive Layout

## Storage Location

Use Google Drive `appDataFolder`.

The app must not use normal visible Drive files for automatic sync.

## Files

Create these files in `appDataFolder`:

```text
saving-series-manifest.json
saving-series-state.json
saving-series-images-index.json
saving-series-image-{syncId}.webp
```

## Manifest

`saving-series-manifest.json` points to the latest cloud files.

```json
{
  "schemaVersion": 1,
  "stateFileId": "google-drive-file-id",
  "imagesIndexFileId": "google-drive-file-id",
  "updatedAt": 1777142400000
}
```

## State File

`saving-series-state.json` contains lightweight data only.

```json
{
  "schemaVersion": 1,
  "updatedAt": 1777142400000,
  "series": [
    {
      "syncId": "uuid",
      "name": "Series name",
      "season": 1,
      "episode": 1,
      "date": "2026-04-25",
      "site": "",
      "note": "",
      "status": "run",
      "updatedAt": 1777142400000,
      "deletedAt": null,
      "imageUpdatedAt": 1777142400000
    }
  ],
  "deleted": [
    {
      "syncId": "uuid",
      "deletedAt": 1777142500000
    }
  ],
  "settings": {
    "containers": {},
    "navbar": "fixed",
    "preferredLanguage": "ru"
  }
}
```

## Images Index

`saving-series-images-index.json` maps `syncId` to image file metadata.

```json
{
  "schemaVersion": 1,
  "images": {
    "uuid": {
      "fileId": "google-drive-file-id",
      "fileName": "saving-series-image-uuid.webp",
      "mimeType": "image/webp",
      "imageUpdatedAt": 1777142400000,
      "size": 123456
    }
  }
}
```

## Image File

Each image file contains one image as raw WebP bytes, not JSON and not Base64.

```text
Drive file name: saving-series-image-{syncId}.webp
Content-Type: image/webp
Body: raw WebP image bytes
```

The app may keep using Data URLs internally in IndexedDB for compatibility with the existing UI, but Google Drive image sync must upload and download raw WebP files. Convert Data URL to `Blob` before upload and convert downloaded WebP bytes back to the local storage format after download.

All synced images are static WebP. Animated images are flattened to the first rendered frame during conversion.

## Why Images Are Separate

- The metadata file remains small and fast.
- App startup is not blocked by image download.
- Images can be downloaded only when needed.
- Failed image sync does not corrupt the metadata state.

## File Update Rule

For first implementation, use a single state file and update it atomically.

Before upload:

1. Download latest remote state.
2. Merge local and remote state.
3. Upload merged state.
4. Store resulting Drive file metadata locally.

This reduces accidental overwrites between devices.
