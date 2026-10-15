/**
 * Utilidades para cifrado/descifrado de datos sensibles
 * Usa AES-256-CBC para cifrar contraseñas SMTP y otros datos sensibles
 */

const crypto = require('crypto');

// New values: AES-256-GCM (authenticated) as "v2:iv:tag:data". Old values: AES-256-CBC "iv:data",
// still readable and re-encrypted to v2 the first time they are used.
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const GCM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12;
const V2 = 'v2';

/**
 * Obtiene la clave de cifrado desde variables de entorno
 * Si no existe, genera una advertencia (debe configurarse en producción)
 */
const LEGACY_KEY = () => crypto.createHash('sha256').update('xyon-fallback-key-change-in-production').digest();

const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
        const buf = Buffer.from(key, 'base64');
        if (buf.length === 32) return buf;
        // Clave con longitud incorrecta: derivar 32 bytes de forma determinista
        return crypto.createHash('sha256').update(key).digest();
    }
    // Sin ENCRYPTION_KEY: derivar de JWT_SECRET (secreto por despliegue) en vez de una clave publica en el codigo
    if (process.env.JWT_SECRET) {
        console.warn('[SECURITY] ENCRYPTION_KEY not set: deriving key from JWT_SECRET. Set ENCRYPTION_KEY (openssl rand -base64 32).');
        return jwtDerivedKey();
    }
    throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set');
};

// Clave derivada de JWT_SECRET: era la clave efectiva cuando ENCRYPTION_KEY no estaba definida.
// Se mantiene como ultimo recurso de descifrado para no romper valores guardados con ella.
const jwtDerivedKey = () => crypto.createHash('sha256').update('xyon-enc:' + process.env.JWT_SECRET).digest();

/**
 * Claves candidatas para descifrar, en orden de preferencia. Se omiten duplicados.
 * - primary: clave actual (ENCRYPTION_KEY, o derivada de JWT_SECRET si no esta definida)
 * - legacy: clave por defecto publica en el codigo (valores antiguos)
 * - jwt-derived: clave derivada de JWT_SECRET (valores cifrados antes de definir ENCRYPTION_KEY)
 */
const keyCandidates = () => {
    const primary = getEncryptionKey();
    const candidates = [{ name: 'primary', key: primary }];
    const legacy = LEGACY_KEY();
    if (!legacy.equals(primary)) candidates.push({ name: 'legacy', key: legacy });
    if (process.env.JWT_SECRET) {
        const derived = jwtDerivedKey();
        if (!derived.equals(primary) && !derived.equals(legacy)) candidates.push({ name: 'jwt-derived', key: derived });
    }
    return candidates;
};

/**
 * Descifra un texto indicando con que clave se ha descifrado
 * @param {string} encryptedText - Texto cifrado en formato: iv:encryptedData (hex)
 * @returns {{ value: string, key: 'primary'|'legacy'|'jwt-derived' }}
 */
const decryptWithInfo = (encryptedText) => {
    if (!encryptedText) return { value: null, key: null };

    if (encryptedText.startsWith(V2 + ':')) {
        const [, ivHex, tagHex, dataHex] = encryptedText.split(':');
        let lastError;
        for (const candidate of keyCandidates()) {
            try {
                const decipher = crypto.createDecipheriv(GCM, candidate.key, Buffer.from(ivHex, 'hex'));
                decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
                const out = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
                return { value: out, key: candidate.name };
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error('Decrypt failed: no candidate key matched');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    let lastError;
    for (const candidate of keyCandidates()) {
        try {
            const decipher = crypto.createDecipheriv(ALGORITHM, candidate.key, iv);
            let out = decipher.update(encrypted, 'hex', 'utf8');
            out += decipher.final('utf8');
            if (candidate.name !== 'primary') {
                console.warn(`[SECURITY] Decrypted with ${candidate.name} key; re-encrypting with the current key.`);
            }
            // Old CBC format: report a non-primary key so callers re-encrypt it as GCM (v2)
            return { value: out, key: candidate.name === 'primary' ? 'primary-cbc' : candidate.name };
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('Decrypt failed: no candidate key matched');
};

/**
 * Cifra un texto usando AES-256-CBC
 * @param {string} text - Texto plano a cifrar
 * @returns {string} Texto cifrado en formato: iv:encryptedData (hex)
 */
const encrypt = (text) => {
    if (!text) return null;
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(GCM_IV_LENGTH);
        const cipher = crypto.createCipheriv(GCM, key, iv);
        const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        return [V2, iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join(':');
    } catch (error) {
        console.error('Error encrypting data:', error);
        throw error;
    }
};

/**
 * Descifra un texto cifrado con AES-256-CBC
 * @param {string} encryptedText - Texto cifrado en formato: iv:encryptedData (hex)
 * @returns {string} Texto plano descifrado
 */
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;

    try {
        return decryptWithInfo(encryptedText).value;
    } catch (error) {
        console.error('Error decrypting data:', error);
        throw error;
    }
};

/**
 * Verifica si un texto está cifrado (formato iv:data)
 * @param {string} text - Texto a verificar
 * @returns {boolean} true si está cifrado
 */
const isEncrypted = (text) => {
    if (!text || typeof text !== 'string') return false;

    const hex = /^[0-9a-fA-F]+$/;
    if (text.startsWith(V2 + ':')) {
        const p = text.split(':');
        return p.length === 4 && p[1].length === GCM_IV_LENGTH * 2 && p[2].length === 32 && p.slice(1).every(x => hex.test(x));
    }

    // Formato cifrado: 32 caracteres hex (IV) + ':' + datos hex
    const parts = text.split(':');
    if (parts.length !== 2) return false;
    
    const ivPart = parts[0];
    const dataPart = parts[1];
    
    // IV debe ser exactamente 32 caracteres hex (16 bytes)
    if (ivPart.length !== 32) return false;
    
    // Verificar que ambas partes sean válidas hex
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(ivPart) && hexRegex.test(dataPart);
};

/**
 * Cifra contraseña SMTP de forma segura
 * Si ya está cifrada, no hace nada
 */
const encryptSMTPPassword = (password) => {
    if (!password) return null;
    
    // Si ya está cifrada, retornar tal cual
    if (isEncrypted(password)) {
        return password;
    }
    
    return encrypt(password);
};

/**
 * Descifra contraseña SMTP de forma segura
 * Si no está cifrada (texto plano legacy), retorna tal cual
 */
const decryptSMTPPassword = (encryptedPassword) => {
    if (!encryptedPassword) return null;
    
    // Si no está cifrada (legacy), retornar tal cual
    if (!isEncrypted(encryptedPassword)) {
        console.warn('⚠️ SMTP password is not encrypted (legacy format)');
        return encryptedPassword;
    }
    
    return decrypt(encryptedPassword);
};

module.exports = {
    encrypt,
    decrypt,
    decryptWithInfo,
    isEncrypted,
    encryptSMTPPassword,
    decryptSMTPPassword
};
