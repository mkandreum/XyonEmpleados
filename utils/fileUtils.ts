/**
 * Opens a protected file in a new tab using the auth token.
 * Handles both new (/api/files/) and legacy (/uploads/) URL formats.
 */
import { getAbsoluteUrl } from './urlUtils';

/**
 * Convert legacy upload URLs to the new API file route format.
 * /uploads/payrolls/xxx.pdf → /api/files/payrolls/xxx.pdf
 * /uploads/private/payrolls/xxx.pdf → /api/files/payrolls/xxx.pdf
 * /api/files/payrolls/xxx.pdf → /api/files/payrolls/xxx.pdf (unchanged)
 */
function normalizeFileUrl(url: string): string {
    if (!url) return url;

    // Strip origin if present to work with path only
    let path = url;
    try {
        const parsed = new URL(url, window.location.origin);
        path = parsed.pathname;
    } catch {
        // not a valid URL, use as-is
    }

        // Convert /uploads/private/payrolls/xxx.pdf → /api/files/payrolls/xxx.pdf
        const privateMatch = path.match(/^\/uploads\/private\/(payrolls?|justifications?|justificante)\/(.+)$/);
    if (privateMatch) {
        return `/api/files/${privateMatch[1]}/${privateMatch[2]}`;
    }

        // Convert /uploads/payrolls/xxx.pdf → /api/files/payrolls/xxx.pdf
        const legacyMatch = path.match(/^\/uploads\/(payrolls?|justifications?|justificante)\/(.+)$/);
    if (legacyMatch) {
        return `/api/files/${legacyMatch[1]}/${legacyMatch[2]}`;
    }

    // Already /api/files/... or other format - return as-is
    return url;
}

export const openProtectedFile = async (fileUrl: string): Promise<void> => {
    if (!fileUrl) return;

    // Normalize legacy URLs to use the authenticated API route
    const normalizedUrl = normalizeFileUrl(fileUrl);
    const absoluteUrl = getAbsoluteUrl(normalizedUrl);
    const token = localStorage.getItem('token');

    if (!token) {
        window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    try {
        const response = await fetch(absoluteUrl, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`File request failed: ${response.status}`);
        }

        // Verify we got an actual file, not HTML (SPA fallback)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            throw new Error('Received HTML instead of file - URL may be invalid');
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
        console.error('openProtectedFile error:', error);
        throw error;
    }
};
