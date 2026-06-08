/**
 * Servicio de auditoría de acciones sensibles
 * Registra accesos a documentos confidenciales, cambios administrativos, etc.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Tipos de acciones auditables
 */
const AUDIT_ACTIONS = {
    // Payrolls
    PAYROLL_DOWNLOAD: 'PAYROLL_DOWNLOAD',
    PAYROLL_UPLOAD: 'PAYROLL_UPLOAD',
    PAYROLL_DELETE: 'PAYROLL_DELETE',
    
    // Users
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    
    // Vacations
    VACATION_APPROVED: 'VACATION_APPROVED',
    VACATION_REJECTED: 'VACATION_REJECTED',
    
    // Fichajes
    FICHAJE_ADJUSTMENT_APPROVED: 'FICHAJE_ADJUSTMENT_APPROVED',
    FICHAJE_ADJUSTMENT_REJECTED: 'FICHAJE_ADJUSTMENT_REJECTED',
    FICHAJE_DELETED: 'FICHAJE_DELETED',
    
    // Settings
    SETTINGS_CHANGED: 'SETTINGS_CHANGED',
    SMTP_CONFIGURED: 'SMTP_CONFIGURED',
    
    // Security
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    PASSWORD_RESET: 'PASSWORD_RESET'
};

/**
 * Registra una acción en el log de auditoría
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} action - Acción realizada (ver AUDIT_ACTIONS)
 * @param {string} resourceType - Tipo de recurso afectado (PAYROLL, USER, etc.)
 * @param {string} resourceId - ID del recurso afectado
 * @param {Object} metadata - Datos adicionales (IP, user agent, detalles)
 * @param {Object} req - Request object de Express (opcional, para capturar IP/UA)
 * @returns {Promise<Object>} Registro de auditoría creado
 */
const logAudit = async (userId, action, resourceType, resourceId, metadata = {}, req = null) => {
    try {
        // Enriquecer metadata con información de la request si está disponible
        const enrichedMetadata = {
            ...metadata,
            timestamp: new Date().toISOString()
        };

        if (req) {
            enrichedMetadata.ip = req.ip || req.connection.remoteAddress;
            enrichedMetadata.userAgent = req.get('user-agent');
            enrichedMetadata.method = req.method;
            enrichedMetadata.path = req.path;
        }

        // Por ahora guardamos en GlobalSettings como JSON temporal
        // TODO: En producción crear tabla AuditLog dedicada
        const auditKey = `audit_${Date.now()}_${userId}_${action}`;
        
        const auditRecord = {
            userId,
            action,
            resourceType,
            resourceId,
            metadata: enrichedMetadata
        };

        await prisma.globalSettings.create({
            key: auditKey,
            value: JSON.stringify(auditRecord)
        });

        console.log(`📝 [AUDIT] ${action} by user ${userId} on ${resourceType}:${resourceId}`);

        return auditRecord;
    } catch (error) {
        // No fallar la operación principal si falla la auditoría
        console.error('❌ [AUDIT] Error logging audit:', error.message);
        return null;
    }
};

/**
 * Obtiene logs de auditoría filtrados
 * @param {Object} filters - Filtros { userId, action, resourceType, startDate, endDate }
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>} Array de logs de auditoría
 */
const getAuditLogs = async (filters = {}, limit = 100) => {
    try {
        // Buscar en GlobalSettings las claves que empiezan con 'audit_'
        const auditSettings = await prisma.globalSettings.findMany({
            where: {
                key: {
                    startsWith: 'audit_'
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });

        // Parsear y filtrar los logs
        let logs = auditSettings.map(setting => {
            try {
                return {
                    ...JSON.parse(setting.value),
                    createdAt: setting.createdAt,
                    key: setting.key
                };
            } catch (e) {
                return null;
            }
        }).filter(log => log !== null);

        // Aplicar filtros
        if (filters.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.action) {
            logs = logs.filter(log => log.action === filters.action);
        }
        if (filters.resourceType) {
            logs = logs.filter(log => log.resourceType === filters.resourceType);
        }
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            logs = logs.filter(log => new Date(log.createdAt) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            logs = logs.filter(log => new Date(log.createdAt) <= end);
        }

        return logs;
    } catch (error) {
        console.error('Error getting audit logs:', error);
        return [];
    }
};

/**
 * Limpia logs de auditoría antiguos (más de X días)
 * @param {number} daysToKeep - Días a mantener (default: 90)
 * @returns {Promise<number>} Número de logs eliminados
 */
const cleanOldAuditLogs = async (daysToKeep = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const deleted = await prisma.globalSettings.deleteMany({
            where: {
                key: {
                    startsWith: 'audit_'
                },
                createdAt: {
                    lt: cutoffDate
                }
            }
        });

        console.log(`🗑️ [AUDIT] Cleaned ${deleted.count} old audit logs (older than ${daysToKeep} days)`);

        return deleted.count;
    } catch (error) {
        console.error('Error cleaning old audit logs:', error);
        return 0;
    }
};

/**
 * Wrapper para auditar descarga de nómina
 */
const auditPayrollDownload = async (userId, payrollId, req = null) => {
    const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
        select: { userId: true, month: true, year: true }
    });

    return logAudit(
        userId,
        AUDIT_ACTIONS.PAYROLL_DOWNLOAD,
        'PAYROLL',
        payrollId,
        {
            targetUserId: payroll?.userId,
            month: payroll?.month,
            year: payroll?.year
        },
        req
    );
};

module.exports = {
    logAudit,
    getAuditLogs,
    cleanOldAuditLogs,
    auditPayrollDownload,
    AUDIT_ACTIONS
};
