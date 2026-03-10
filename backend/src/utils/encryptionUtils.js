/**
 * Utilidades para cifrado/descifrado de datos sensibles
 * Usa AES-256-CBC para cifrar contraseñas SMTP y otros datos sensibles
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Obtiene la clave de cifrado desde variables de entorno
 * Si no existe, genera una advertencia (debe configurarse en producción)
 */
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
        console.warn('⚠️ WARNING: ENCRYPTION_KEY not set in environment variables');
        console.warn('⚠️ Using fallback key - THIS IS NOT SECURE FOR PRODUCTION');
        console.warn('⚠️ Generate a key with: openssl rand -base64 32');
        
        // Fallback key solo para desarrollo (NUNCA usar en producción)
        return crypto.createHash('sha256').update('xyon-fallback-key-change-in-production').digest();
    }
    
    // Convertir la clave base64 a buffer
    return Buffer.from(key, 'base64');
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
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Retornar iv + encrypted data separados por ':'
        return iv.toString('hex') + ':' + encrypted;
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
        // Separar iv y datos cifrados
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
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
    isEncrypted,
    encryptSMTPPassword,
    decryptSMTPPassword
};
