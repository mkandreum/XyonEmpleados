/**
 * Identificación del cliente de una petición:
 * - IP real (detrás de Cloudflare / nginx / proxy)
 * - Navegador, sistema operativo y tipo de dispositivo a partir del User-Agent
 */

const getRealIp = (req) => {
    if (!req || !req.headers) return null;
    const first = (v) => (v ? String(v).split(',')[0].trim() : null);

    return (
        first(req.headers['cf-connecting-ip']) ||
        first(req.headers['true-client-ip']) ||
        first(req.headers['x-real-ip']) ||
        first(req.headers['x-forwarded-for']) ||
        req.ip ||
        (req.connection && req.connection.remoteAddress) ||
        (req.socket && req.socket.remoteAddress) ||
        null
    );
};

const parseUserAgent = (ua) => {
    const s = String(ua || '');
    if (!s) {
        return { browser: 'Desconocido', os: 'Desconocido', device: 'Desconocido', clientType: 'desconocido' };
    }

    let browser = 'Desconocido';
    let os = 'Desconocido';
    let device = 'Desconocido';
    let clientType = 'navegador';

    // Sistema operativo
    if (/Windows NT/i.test(s)) os = 'Windows';
    else if (/CrOS/i.test(s)) os = 'ChromeOS';
    else if (/Android/i.test(s)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
    else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
    else if (/Linux/i.test(s)) os = 'Linux';

    // Navegador / cliente (el orden importa: los más específicos primero)
    if (/okhttp/i.test(s)) { browser = 'App Xyon (okhttp)'; clientType = 'app'; }
    else if (/Edg\//i.test(s)) browser = 'Edge';
    else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
    else if (/SamsungBrowser/i.test(s)) browser = 'Samsung Internet';
    else if (/FxiOS\//i.test(s)) browser = 'Firefox (iOS)';
    else if (/Firefox\//i.test(s)) browser = 'Firefox';
    else if (/CriOS\//i.test(s)) browser = 'Chrome (iOS)';
    else if (/Chrome\//i.test(s)) browser = 'Chrome';
    else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = 'Safari';
    else if (/curl/i.test(s)) { browser = 'curl'; clientType = 'cli'; }
    else if (/PostmanRuntime/i.test(s)) { browser = 'Postman'; clientType = 'cli'; }

    // Tipo de dispositivo
    if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(s)) device = 'Tablet';
    else if (/Mobile|iPhone|iPod|Windows Phone/i.test(s)) device = 'Móvil';
    else if (os !== 'Desconocido') device = 'Ordenador';

    return { browser, os, device, clientType };
};

const describeClient = (req) => {
    const userAgent = (req && req.get)
        ? (req.get('user-agent') || '')
        : ((req && req.headers && req.headers['user-agent']) || '');
    const { browser, os, device, clientType } = parseUserAgent(userAgent);
    return { ip: getRealIp(req), userAgent, browser, os, device, clientType };
};

module.exports = { getRealIp, parseUserAgent, describeClient };
