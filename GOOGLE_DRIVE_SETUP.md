# Google Drive Integration Setup Guide

This guide will walk you through setting up Google Drive integration for the SavingSeries application.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- The SavingSeries application running locally or deployed

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "SavingSeries")
5. Click "Create"
6. Wait for the project to be created and then select it from the project dropdown

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on the Google Drive API result
4. Click the **Enable** button
5. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Select "External" user type (unless you have a Google Workspace account and want internal only)
3. Click "Create"
4. Fill in the required fields:
    - **App name**: SavingSeries
    - **User support email**: Your email address
    - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the Scopes page:
    - Click "Add or Remove Scopes"
    - Search for and select these scopes:
        - `https://www.googleapis.com/auth/drive.file` (View and manage Google Drive files that you have opened or
          created with this app)
        - `https://www.googleapis.com/auth/drive.appdata` (View and manage its own configuration data in your Google
          Drive)
    - Click "Update"
    - Click "Save and Continue"
7. On the Test Users page (if in testing mode):
    - Click "Add Users"
    - Add your email address and any other test users
    - Click "Save and Continue"
8. Review the summary and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Client ID

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth client ID**
3. Select **Web application** as the Application type
4. Enter a name for your OAuth client (e.g., "SavingSeries Web Client")
5. Under **Authorized JavaScript origins**, add:
    - For local development: `http://localhost:5173` (or your local dev server port)
    - For production: `https://yourdomain.com` (replace with your actual domain)
    - You can add multiple origins if needed
6. Leave **Authorized redirect URIs** empty (not needed for implicit flow)
7. Click **Create**
8. A dialog will appear with your credentials:
    - **Copy the Client ID** - you'll need this in the next step
    - You can ignore the Client Secret for this implementation

## Step 5: Update Application Configuration

1. Open the file `src/js/config.js` in your SavingSeries project
2. Replace the placeholder with your actual Client ID:
   ```javascript
   // Replace with your actual Google OAuth 2.0 Client ID
   export const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
   ```
   Example:
   ```javascript
   export const GOOGLE_CLIENT_ID = '123456789012-abcdefghijklmnop.apps.googleusercontent.com';
   ```
3. Save the file

## Step 6: Build and Deploy

### For Development:

```bash
# Install dependencies if you haven't already
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

### For Production:

```bash
# Build the application
npm run build
# or
yarn build

# Deploy the dist folder to your web server
```

## Step 7: Test the Integration

1. Open your application in a web browser
2. Click on the menu (☰) button
3. Click on "Google Drive Settings" or the Google Drive icon
4. Click "Login to Google Drive"
5. A Google sign-in window will appear:
    - Select your Google account
    - Review the permissions requested
    - Click "Allow" to grant access
6. Once authenticated, you should see:
    - Status showing "Connected to Google Drive"
    - Your email address displayed
    - Options to sync and logout

## Step 8: Using Google Drive Features

Once connected, you can:

- **Manual Sync**: Click "Sync with Google Drive" to manually backup your data
- **Automatic Backup**: Your data will be automatically backed up periodically
- **Cross-device Sync**: Access your series data from any device by logging into the same Google account

## Troubleshooting

### "Template with id 'googleDriveDialogTemplate' not found" Error

- Ensure the templates.html file has been properly updated
- Clear your browser cache and reload the page
- Check that templates are being injected correctly on page load

### "Invalid Client ID" Error

- Verify the Client ID in config.js matches exactly what's shown in Google Cloud Console
- Ensure there are no extra spaces or characters
- Check that the Client ID includes the `.apps.googleusercontent.com` suffix

### "Origin not allowed" Error

- Add your current URL to the Authorized JavaScript origins in Google Cloud Console
- For local development, make sure to include the exact port (e.g., `http://localhost:5173`)
- Wait a few minutes after adding origins for changes to propagate

### "Unauthorized scope" Error

- Ensure both required scopes are added to your OAuth consent screen configuration
- If you modified scopes, users may need to re-authenticate

### Build Errors

- Run `npm install` or `yarn install` to ensure all dependencies are installed
- Check for any syntax errors in the JavaScript files
- Verify all import paths are correct

## Security Notes

1. **Never commit credentials**: The config.js file with your Client ID should be added to .gitignore if it contains
   sensitive information
2. **Use environment variables**: For production, consider using environment variables instead of hardcoding the Client
   ID
3. **Restrict origins**: Only add the specific origins you need in the Google Cloud Console
4. **Regular audits**: Periodically review your Google Cloud Console to ensure no unauthorized access

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Drive API v3 Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

## Support

If you encounter any issues not covered in this guide, please:

1. Check the browser console for detailed error messages
2. Verify all configuration steps have been completed
3. Ensure your Google Cloud project has the Drive API enabled
4. Check that your OAuth consent screen is properly configured

---

*Last updated: January 2025*