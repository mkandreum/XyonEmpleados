/**
 * Converts relative upload URLs to absolute URLs for cross-device compatibility
 */
export const getAbsoluteUrl = (url: string | undefined): string => {
    if (!url) return '';
    // Block script-capable schemes (javascript:, vbscript:, data:text/html…)
    const scheme = /^\s*([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
    if (scheme && !['http', 'https', 'blob'].includes(scheme) && !/^data:image\//i.test(url.trim())) return '';

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If root-relative path, convert to absolute
    if (url.startsWith('/')) {
        return `${window.location.origin}${url}`;
    }

    // Return as-is for other cases (data URLs, etc.)
    return url;
};
