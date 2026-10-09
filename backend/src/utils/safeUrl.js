// Validacion de URLs internas de ficheros privados (/api/files/<tipo>/<fichero>)
const FILE_RE = /^\/api\/files\/(payrolls|justifications)\/([A-Za-z0-9_.-]+)$/;

/**
 * Devuelve true si `url` apunta a un fichero privado del tipo indicado y, salvo ADMIN,
 * el fichero fue subido por `ownerId` (prefijo "<userId>-" anadido por uploadController).
 */
function isOwnedPrivateFileUrl(url, type, ownerId, role) {
    if (typeof url !== 'string' || url.length > 500) return false;
    const m = FILE_RE.exec(url);
    if (!m || m[1] !== type || m[2].includes('..')) return false;
    if (role === 'ADMIN') return true;
    return m[2].startsWith(String(ownerId) + '-');
}

module.exports = { isOwnedPrivateFileUrl, FILE_RE };
