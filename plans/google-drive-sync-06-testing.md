# Google Drive Sync: Testing Plan

## Local Migration Tests

Test with existing IndexedDB data from version `2`.

Expected result:

- Database opens successfully.
- All old series remain visible.
- Each series has `syncId`.
- Each series has sync timestamps.
- Images remain available.

## Single Device Tests

Cases:

- Sign in with Google.
- Create initial cloud state.
- Add a series.
- Edit a series.
- Delete a series.
- Sync manually.
- Reload page.
- Sync again.

Expected result:

- No duplicate records.
- Deleted records do not reappear.
- Status is understandable.

## Two Browser Tests

Use two browser profiles or two browsers signed into the same Google account.

Cases:

- Browser A adds a series, Browser B syncs.
- Browser B edits the series, Browser A syncs.
- Browser A deletes the series, Browser B syncs.
- Both browsers add different series offline, then sync.

Expected result:

- Adds sync both ways.
- Edits sync by last-write-wins.
- Deletes sync through tombstones.
- Different offline additions both survive.

## Conflict Tests

Cases:

- Same series edited on two browsers before sync.
- Same series deleted on one browser and edited on another.
- Same image changed on two browsers.

Expected result for first version:

- Metadata uses larger `updatedAt`.
- Delete wins only if `deletedAt` is newer than `updatedAt`.
- Image uses larger `imageUpdatedAt`.

## Offline Tests

Cases:

- Start app offline.
- Edit data offline.
- Delete data offline.
- Go online.
- Trigger automatic sync.

Expected result:

- App remains usable offline.
- Local changes are not lost.
- Sync resumes when online.

## Image Tests

Cases:

- Series without image.
- Series with small image.
- Series with near-limit image.
- PNG image with transparency.
- Animated image.
- Many series with images.
- Remote image missing from Drive.

Expected result:

- Metadata loads before images.
- Images appear progressively.
- Uploaded images are raw WebP Drive files, not Base64 JSON.
- Transparency is preserved when converted to WebP.
- Animated images are flattened to the first rendered frame.
- Missing image does not break metadata sync.
- UI does not freeze.

## Recovery Tests

Cases:

- Clear local IndexedDB, then download from Drive.
- Bad local state, upload local to Drive after confirmation.
- Sign out and continue using local app.
- Sign back in and sync.

Expected result:

- Recovery actions are explicit.
- User sees confirmation before replacement.
- Local-only usage remains possible.

## Build Verification

After implementation stages, run:

```bash
npm run build
```

There is currently no test runner configured in `package.json`, so manual scenario testing is required unless tests are added later.
