const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GOOGLE_CLIENT_ID = typeof rawGoogleClientId === 'string'
    ? rawGoogleClientId.trim()
    : '';

export function isGoogleDriveConfigured() {
    return GOOGLE_CLIENT_ID.length > 0;
}
