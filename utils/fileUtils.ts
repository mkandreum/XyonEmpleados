/**
 * Opens a protected file in a new tab using the auth token.
 */
import { getAbsoluteUrl } from './urlUtils';

export const openProtectedFile = async (fileUrl: string): Promise<void> => {
    if (!fileUrl) return;

    const absoluteUrl = getAbsoluteUrl(fileUrl);
    const token = localStorage.getItem('token');

    if (!token) {
        window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    const response = await fetch(absoluteUrl, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`File request failed: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};
