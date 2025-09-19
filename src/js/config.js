// src/js/config.js
/**
 * Google API Configuration
 *
 * IMPORTANT: You must replace these placeholder values with your own credentials
 * from the Google Cloud Console to enable Google Drive integration.
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Enable the Google Drive API:
 *    - Navigate to "APIs & Services" > "Library"
 *    - Search for "Google Drive API" and enable it
 * 4. Create OAuth 2.0 credentials:
 *    - Go to "APIs & Services" > "Credentials"
 *    - Click "Create Credentials" > "OAuth client ID"
 *    - Configure the OAuth consent screen if prompted
 *    - Select "Web application" as the application type
 *    - Add your application's URL to "Authorized JavaScript origins"
 *      (e.g., http://localhost:5173 for development, https://yourdomain.com for production)
 *    - Leave "Authorized redirect URIs" empty (not needed for implicit flow)
 *    - Copy the generated Client ID
 * 5. (Optional) Create an API Key:
 *    - Click "Create Credentials" > "API key"
 *    - Restrict the API key to your domain for security
 *
 * Security Note: Never commit real credentials to version control.
 * Consider using environment variables or a separate config file that's gitignored.
 */

// Replace with your actual Google API Key (optional, not required for OAuth)
export const GOOGLE_API_KEY = 'AIzaSyDEPxTfH7jkwhKc8QZaSeqJl5c2ln0QBxQ';

// Replace with your actual Google OAuth 2.0 Client ID (required)
export const GOOGLE_CLIENT_ID = '872776343857-toupi61uuvpu93tgmtv37hqc3isrgc3s.apps.googleusercontent.com';
