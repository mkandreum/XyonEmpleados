/**
 * Converts relative upload URLs to absolute URLs for cross-device compatibility
 */
export const getAbsoluteUrl = (url: string | undefined): string => {
    if (!url) return '';

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If relative upload path, convert to absolute
    if (url.startsWith('/uploads')) {
        return `${window.location.origin}${url}`;
    }

    // Return as-is for other cases (data URLs, etc.)
    return url;
};
