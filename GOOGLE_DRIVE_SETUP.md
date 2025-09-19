# Google Drive Integration Setup Guide
This document describes the new Google Drive integration plan for SavingSeries and the exact Google Cloud / Google Auth configuration required to make it work.
The goal of the first implementation is stability and predictability:
- fast restore of series metadata;
- background download of heavy images after the UI is already usable;
- no dangerous auto-merge;
- no incomplete two-way sync yet;
- storage inside Google Drive `appDataFolder`, not in a visible user folder.
After this stable version is complete, the next stage will be a true sync model with `last write wins`.
## Integration Strategy
The Google Drive implementation will be built in two stages.
### Stage 1: Stable backup and restore
This is the version that should be implemented first.
Behavior:
- user signs in with Google;
- app uploads a single manifest file to Drive;
- images are stored as separate files;
- restore downloads the manifest first;
- app restores all series metadata immediately;
- images are downloaded in the background and attached later;
- no automatic conflict merge between local data and remote data.
### Stage 2: Real sync with `last write wins`
This comes only after Stage 1 is working and verified.
Behavior:
- each record gets local and remote timestamps / revision markers;
- local and remote states can both change;
- when conflict happens, the newest version wins;
- deleted items must also be tracked explicitly;
- image file updates must follow the same rule.
This document mainly describes Stage 1 in detail, but also includes preparation notes for Stage 2.
## Why This Architecture
The current project already separates local metadata and local images in IndexedDB:
- metadata is stored in `series_meta`;
- images are stored in `series_images`.
This is already a good fit for fast UI loading.
The Google Drive implementation should mirror that idea:
- one manifest file with all metadata;
- many separate image files;
- UI restore should not wait for all images;
- images should be loaded lazily after metadata import.
This avoids the main problem of a single huge backup file: slow startup and slow restore when many heavy images are embedded inline.
## Final Stage 1 Data Model
### 1. Manifest file
A single JSON file stored in Google Drive `appDataFolder`.
Recommended filename:
- `savingseries.manifest.json`
Recommended structure:
```json
{
  "schemaVersion": 1,
  "appVersion": "2.0.0",
  "updatedAt": "2026-03-08T12:00:00.000Z",
  "deviceId": "local-browser-device-id",
  "series": [
    {
      "id": 12,
      "name": "Dark",
      "season": 1,
      "episode": 3,
      "date": "2026-03-01T00:00:00.000Z",
      "site": "",
      "note": "",
      "status": "RUN",
      "image": {
        "fileId": "1AbCdEfGhIj",
        "mimeType": "image/webp",
        "fileName": "12.webp",
        "updatedAt": "2026-03-08T12:00:00.000Z"
      }
    }
  ]
}
Notes:
- series must remain an array, because the local backup/import layer already works with arrays.
- image binary data must not be embedded in the manifest.
- if a series has no image, image can be missing or null.
2. Image files
Each image is stored as its own file in appDataFolder.
Recommended filename convention:
- <seriesId>.<ext>
Examples:
- 12.webp
- 77.jpg
3. Future sync fields for Stage 2
To prepare for last write wins, each series should later gain fields like:
{
  "updatedAt": "2026-03-08T12:00:00.000Z",
  "deleted": false
}
But for Stage 1 they are optional and not part of conflict resolution yet.
Storage Location in Google Drive
Use only appDataFolder.
Why:
- files are hidden from the regular Drive UI;
- the app can access only its own app data;
- this is the correct storage for app-private backup/sync state;
- it avoids cluttering the user’s visible Drive folders.
Important constraints of appDataFolder:
- files there are not visible in standard Drive UI;
- files there are app-private;
- they are not meant for user sharing;
- the app should list them with spaces=appDataFolder.
OAuth Scope Strategy
For the first stable version, request the smallest practical scopes.
Required scope
- https://www.googleapis.com/auth/drive.appdata
This is enough if the app stores both the manifest and all images inside appDataFolder.
Scope to avoid for now
- https://www.googleapis.com/auth/drive
- https://www.googleapis.com/auth/drive.readonly
- https://www.googleapis.com/auth/drive.metadata
- https://www.googleapis.com/auth/drive.metadata.readonly
Why avoid them:
- they are broader than needed;
- some are restricted scopes;
- they increase verification burden;
- they are unnecessary for app-private backup storage.
Optional scope not needed in Stage 1
- https://www.googleapis.com/auth/drive.file
This is useful when the user should explicitly choose visible Drive files with Picker or when the app works with user-visible files. For this implementation, appDataFolder is enough.
Google Cloud Setup
This section explains exactly what must be configured in Google Cloud and Google Auth Platform.
Step 1: Create or choose a Google Cloud project
1. Open https://console.cloud.google.com/
2. Select an existing project or click New Project
3. Recommended project name:
   - SavingSeries
4. Wait until the project is created
5. Make sure this project is selected in the top project switcher
Step 2: Enable Google Drive API
1. In Google Cloud Console, open:
   - APIs & Services -> Library
2. Search for:
   - Google Drive API
3. Open it
4. Click Enable
Do not continue until the API is enabled in the selected project.
Step 3: Configure Google Auth Platform
Google has moved OAuth consent configuration into Google Auth Platform.
Open:
- Google Cloud Console -> Google Auth Platform
You will usually work with these pages:
- Branding
- Audience
- Data Access
- Clients
Step 4: Configure Branding
Open:
- Google Auth Platform -> Branding
If the platform is not configured yet, click Get Started.
Fill in:
App information
- App name:
  - SavingSeries
- User support email:
  - your real email that you monitor
Audience choice
Choose one of the following:
- Internal
  - only if you use Google Workspace and this app is for your organization only
- External
  - recommended for normal personal/public use
For this project, usually choose:
- External
Developer contact information
Add one or more email addresses that you actually use.
Finish
Accept the Google API Services User Data Policy and complete setup.
Step 5: Configure Audience
Open:
- Google Auth Platform -> Audience
If app is External and still in testing
Add test users:
1. Click Add users
2. Add your Google account email
3. Add any other testers
4. Save
Important:
- while the app is in testing mode, only listed test users can authorize it;
- if you try to sign in with another Google account, auth will fail.
Publishing status
For local development and early testing, testing mode is enough.
Production publication is only needed later if you want broader usage without test-user restrictions.
Step 6: Configure Data Access
Open:
- Google Auth Platform -> Data Access
Add only the required scope:
- https://www.googleapis.com/auth/drive.appdata
That scope is the key to storing app-private files in appDataFolder.
Do not add broad Drive scopes unless the implementation truly needs them.
Step 7: Create OAuth Client
Open:
- Google Auth Platform -> Clients
Create a new client.
Client type
Choose:
- Web application
Name
Recommended:
- SavingSeries Web Client
Authorized JavaScript origins
Add every origin from which the app will run.
Examples:
- http://localhost:5173
- http://127.0.0.1:5173
- https://your-domain.example
- https://www.your-domain.example
Important rules:
- origin must match protocol, domain, and port exactly;
- if you use both localhost and 127.0.0.1, add both;
- if you use preview/staging/prod domains, add each one separately.
Authorized redirect URIs
For the popup token model in browser-only GIS flow, redirect URIs are usually not needed.
If the interface asks for them and allows leaving empty, leave empty.
After client creation
Copy and save the generated:
- Client ID
This is the main credential needed by the frontend.
Step 8: Domain and production requirements
These are required mainly when you want a production-grade external app.
Authorized domains
If you publish the app externally in production and specify homepage/privacy/terms URLs, their domains must be registered as authorized domains.
This matters especially for:
- homepage URL
- privacy policy URL
- terms of service URL
Brand verification
If the app is external and you want verified branding or broader publication, Google may require brand verification.
Possible outcomes:
- testing only: no full public publish needed yet;
- public production use: likely verification steps appear.
For a personal/private app used only by your own test users, this is often not immediately necessary.
Step 9: Credentials handling inside the app
The project must stop hardcoding real credentials inside source files.
Current risky location:
- src/js/config.js
The new implementation should move configuration to environment-based values.
Recommended Vite approach:
- VITE_GOOGLE_CLIENT_ID=...
Then the app reads it from build-time environment instead of committing secrets into source control.
Note:
- OAuth Client ID is not a secret in the same sense as a client secret, but it still should not be casually hardcoded in a reusable public repo unless that is intentional and documented.
Stage 1 Implementation Plan
This section describes exactly what should be built in the codebase.
Files to replace or refactor
Main files involved
- src/js/googleAuth.js
- src/js/googleDrive.js
- src/js/googleDriveIntegration.js
- src/js/backup.js
- src/js/config.js
- src/js/menu.js
- src/html/templates.html
Files to retire from active logic
- src/js/googleDriveSync.js
This file should not drive Stage 1 behavior anymore.
It can either be removed or left unused until Stage 2 is designed properly.
Stage 1: Authentication behavior
Goal
Use Google Identity Services token model for browser-only auth.
Required behavior
- load GIS client script;
- initialize token client with the configured Client ID;
- request drive.appdata scope;
- store access token in local storage;
- support re-login when token expires;
- support revoke/logout.
Important behavior constraints
- browser token model gives short-lived access tokens;
- do not pretend that refresh-token flow exists in this frontend-only setup;
- when token expires, obtain a new token through user interaction;
- background jobs must not rely on silent indefinite refresh.
What to simplify in code
src/js/googleAuth.js should:
- keep init();
- keep login();
- keep logout();
- keep authenticatedFetch();
- keep withAuthRetry() only if it re-requests token safely;
- remove or downgrade fake refresh-token architecture that assumes backend-like flows.
Stage 1: Drive file API layer
Goal
Make src/js/googleDrive.js a small, predictable wrapper.
Responsibilities
It should manage only these concerns:
- list files in appDataFolder;
- create manifest file;
- update manifest file;
- download manifest file;
- upload image file;
- download image file;
- optionally delete orphaned image files later.
Recommended methods
Manifest:
- getManifestFile()
- downloadManifest()
- createManifest(data)
- updateManifest(fileId, data)
- saveManifest(data)
Images:
- uploadImage(seriesId, blob, mimeType)
- downloadImage(fileId)
- listImageFiles()
Helpers:
- listAppDataFiles()
- uploadMultipart(...)
- downloadFileContent(fileId)
- deleteFile(fileId)
Search behavior
All listing must use:
- spaces=appDataFolder
Do not create a visible Drive folder like SavingSeries.
Stage 1: Backup flow
Goal
A user-triggered action that safely uploads current local state.
Source of truth
Use src/js/backup.js as the serialization source.
exportForDrive() should remain the source for local data extraction.
Upload algorithm
1. Read all local data through backup.exportForDrive()
2. For each series:
   - keep metadata in memory;
   - if image exists, upload image separately and collect its remote metadata
3. Build manifest array with image references, not inline image payload
4. Save manifest to appDataFolder
5. Show success message only after manifest save succeeds
Why manifest must be saved last
Because the manifest is the index.
If manifest points to image files that failed to upload, restore becomes inconsistent.
So:
- upload or update image files first;
- update manifest last.
Stage 1: Restore flow
Goal
Restore quickly, then hydrate images gradually.
Restore algorithm
1. Download manifest from appDataFolder
2. Validate manifest schema
3. Convert manifest series into local import format without heavy inline image data
4. Clear current local data only after user confirms restore
5. Import metadata records immediately into IndexedDB
6. Refresh UI so the app becomes usable fast
7. Start background queue:
   - download each remote image by fileId
   - store image into series_images
   - update visible cards progressively
Important detail
For restore speed, metadata import and initial UI render must not wait for all images.
Stage 1: UI behavior
Menu actions
Keep user-facing actions simple:
- Login to Google Drive
- Logout from Google Drive
- Backup to Google Drive
- Restore from Google Drive
Optional later:
- Sync with Google Drive
But for Stage 1, sync should either be hidden or behave as a safe explicit action, not an auto-merge.
Dialog behavior
Drive settings dialog should show:
- connected / not connected;
- current scope status;
- token expiration state if available;
- login button;
- logout button;
- backup button;
- restore button.
Stage 1: Local import/export contract
Keep array contract
src/js/backup.js currently works with arrays of series.
That should remain the contract for Stage 1.
Recommended local import/export shape:
{
  "series": [
    {
      "id": 1,
      "name": "Example",
      "season": 1,
      "episode": 1,
      "date": "2026-03-08T00:00:00.000Z",
      "site": "",
      "note": "",
      "status": "RUN"
    }
  ]
}
The local import path may attach image data later after background downloads complete.
Do not switch to object-by-id yet
Do not rewrite the backup layer to { [id]: series } in Stage 1.
That was one of the sources of breakage in the current implementation.
Stage 1: IndexedDB behavior
Import
On restore:
- series metadata goes into series_meta;
- images go into series_images later, in background;
- existing UI should tolerate missing images temporarily.
Rendering
Current UI already lazily loads images from DB, which is useful.
That existing behavior should be preserved and adapted to the new restore queue.
Stage 1: Error handling
The implementation must treat these as first-class scenarios:
Auth errors
- popup closed;
- popup blocked;
- invalid client ID;
- user is not in test users list;
- origin not allowed;
- token expired.
Drive errors
- manifest not found;
- Drive API disabled;
- insufficient scope;
- appDataFolder listing failure;
- upload partially succeeded;
- image download failed.
Required user-facing behavior
- manifest download failure should not wipe local data;
- restore must confirm before destructive import;
- partial image restore should still keep metadata restore successful;
- image failures should be logged and retried later if possible.
Stage 1: Security and privacy notes
- use only drive.appdata unless broader access is truly necessary;
- keep user data in hidden app storage;
- do not hardcode client secrets in frontend;
- do not request restricted Drive scopes for this use case;
- do not expose app-private backup files in visible Drive folders.
Stage 1: Testing checklist
Google Cloud configuration checklist
- project selected correctly;
- Google Drive API enabled;
- Google Auth Platform configured;
- app audience set correctly;
- test users added if external testing mode;
- drive.appdata added in Data Access;
- Web OAuth Client created;
- correct JavaScript origins added.
Local development checklist
- app runs on the exact allowed origin;
- login popup opens;
- user can grant consent;
- access token is returned;
- app can list appDataFolder;
- app can create manifest;
- app can update manifest;
- app can upload image files;
- app can download manifest;
- app can restore metadata;
- app can download images in background.
Failure-mode checklist
- wrong origin produces clear error;
- non-test user is rejected cleanly;
- expired token can be replaced via new login;
- restore with no remote data shows friendly message;
- one broken image does not break full restore.
Stage 2 Preview: last write wins
This is not part of the first implementation, but Stage 1 should leave room for it.
Required future data additions
Each series should eventually include:
- updatedAt
- optional deletedAt
- optional image.updatedAt
The manifest itself should also include:
- updatedAt
- optional revision
Future conflict rule
If both local and remote versions exist:
- compare updatedAt;
- the newer version wins;
- apply the same rule to image metadata and image file replacement.
Future deletion rule
Deletion must be explicit.
If a record is simply missing, that is ambiguous.
Instead, future sync should use tombstones or deletion markers such as:
{
  "id": 12,
  "deleted": true,
  "updatedAt": "2026-03-08T12:00:00.000Z"
}
Without this, last write wins will restore deleted items incorrectly.
Troubleshooting
Error: origin_mismatch or origin not allowed
Cause:
- current browser origin is not listed in OAuth client origins.
Fix:
1. Open Google Auth Platform -> Clients
2. Edit your Web client
3. Add the exact origin
4. Save
5. Wait a few minutes and try again
Examples:
- http://localhost:5173
- http://127.0.0.1:5173
These are different origins and must be added separately if both are used.
Error: app is not available for this user
Cause:
- app is in testing mode and your account is not in test users.
Fix:
1. Open Google Auth Platform -> Audience
2. Add your email to Test users
3. Save
4. Retry login
Error: unverified app warning
Cause:
- app is external and not verified/published for broad public use.
For local development, this is expected.
Fix options:
- keep using test users;
- later complete branding / verification / production publication if needed.
Error: Drive API has not been used or is disabled
Cause:
- Google Drive API was not enabled in the selected project.
Fix:
1. Open APIs & Services -> Library
2. Search Google Drive API
3. Click Enable
Error: insufficient permissions
Cause:
- code requests a scope not declared in Data Access;
- or token was issued without the required scope.
Fix:
1. Ensure drive.appdata is added in Data Access
2. Re-login so Google issues a new token with the correct scope
Error: manifest not found
Cause:
- nothing has been backed up yet.
Expected behavior:
- restore should show a friendly "no backup found" message;
- app must not clear local data.
Recommended implementation order
1. Clean up src/js/googleAuth.js
2. Replace src/js/googleDrive.js with minimal appDataFolder API
3. Disable or remove structured sync logic in src/js/googleDriveSync.js
4. Rebuild src/js/googleDriveIntegration.js around:
   - login
   - backup
   - restore
5. Keep src/js/backup.js as the stable import/export contract
6. Add background image restore queue
7. Move GOOGLE_CLIENT_ID out of committed source config
8. Update UI texts and docs
9. Test on:
   - localhost
   - second browser profile
   - at least one restore with many large images
Final recommendation
Build Stage 1 first:
- appDataFolder
- one manifest file
- separate image files
- fast restore
- background image loading
- no auto-merge
Only after that is stable, add Stage 2:
- per-record timestamps
- deletion markers
- last write wins
This order gives a system that is actually usable, debuggable, and safe.