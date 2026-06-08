/**
 * Servicio centralizado de notificaciones
 * Maneja notificaciones in-app, emails y push notifications de forma unificada
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('../controllers/notificationController');
const { sendTemplateEmail } = require('./emailService');

/**
 * Esquema de tipos de notificación
 * Define cómo se procesa cada tipo de evento
 */
const NOTIFICATION_TEMPLATES = {
    'VACATION_APPROVED': {
        title: 'Solicitud Aprobada',
        getMessage: (data) => `Tu solicitud de ${data.requestType} del ${data.startDate} al ${data.endDate} ha sido aprobada`,
        emailTemplate: 'REQUEST_APPROVED',
        priority: 'normal'
    },
    'VACATION_REJECTED': {
        title: 'Solicitud Rechazada',
        getMessage: (data) => `Tu solicitud de ${data.requestType} ha sido rechazada. Motivo: ${data.reason || 'No especificado'}`,
        emailTemplate: 'REQUEST_REJECTED',
        priority: 'normal'
    },
    'VACATION_PENDING_MANAGER': {
        title: 'Nueva Solicitud Pendiente',
        getMessage: (data) => `${data.employeeName} ha solicitado ${data.requestType} del ${data.startDate} al ${data.endDate}`,
        emailTemplate: null, // Sin email automático para managers (opcinal)
        priority: 'high'
    },
    'VACATION_PENDING_ADMIN': {
        title: 'Solicitud Requiere Aprobación Final',
        getMessage: (data) => `${data.employeeName} - ${data.requestType} del ${data.startDate} al ${data.endDate} (ya aprobada por manager)`,
        emailTemplate: null,
        priority: 'high'
    },
    'LATE_ARRIVAL': {
        title: 'Aviso de Llegada Tarde',
        getMessage: (data) => `Tu manager ${data.managerName} ha registrado una llegada tarde el ${data.date} a las ${data.time}`,
        emailTemplate: 'LATE_ARRIVAL',
        priority: 'normal'
    },
    'CLOCKING_WARNING': {
        title: 'Aviso de Fichaje',
        getMessage: (data) => `Problema con tu fichaje del ${data.date}: ${data.details}`,
        emailTemplate: 'CLOCKING_WARNING',
        priority: 'normal'
    },
    'FICHAJE_ADJUSTMENT_APPROVED': {
        title: 'Ajuste de Fichaje Aprobado',
        getMessage: (data) => `Tu solicitud de ajuste de fichaje del ${data.date} ha sido aprobada`,
        emailTemplate: null,
        priority: 'normal'
    },
    'FICHAJE_ADJUSTMENT_REJECTED': {
        title: 'Ajuste de Fichaje Rechazado',
        getMessage: (data) => `Tu solicitud de ajuste de fichaje del ${data.date} ha sido rechazada. Motivo: ${data.reason || 'No especificado'}`,
        emailTemplate: null,
        priority: 'normal'
    },
    'GENERIC': {
        title: (data) => data.title || 'Notificación',
        getMessage: (data) => data.message || '',
        emailTemplate: null,
        priority: 'normal'
    }
};

/**
 * Envía una notificación unificada (in-app + email + push)
 * @param {string} userId - ID del usuario destinatario
 * @param {string} type - Tipo de notificación (ver NOTIFICATION_TEMPLATES)
 * @param {Object} data - Datos para la notificación
 * @param {Object} options - Opciones adicionales { sendEmail: true/false, sendPush: true/false }
 * @returns {Promise<Object>} Resultado de la notificación
 */
const notifyUser = async (userId, type, data, options = {}) => {
    try {
        const template = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES['GENERIC'];
        
        // Obtener usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true, id: true }
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // Preparar variables para el mensaje
        const enrichedData = {
            ...data,
            employeeName: data.employeeName || user.name
        };

        // 1. Crear notificación in-app
        const title = typeof template.title === 'function' 
            ? template.title(enrichedData) 
            : template.title;
        
        const message = typeof template.getMessage === 'function'
            ? template.getMessage(enrichedData)
            : template.getMessage;

        const notification = await createNotification(
            userId,
            title,
            message
        );

        console.log(`✅ [notifyUser] In-app notification created for ${user.email} (${type})`);

        // 2. Enviar email si está configurado y habilitado
        const shouldSendEmail = options.sendEmail !== false && template.emailTemplate;
        
        if (shouldSendEmail) {
            try {
                await sendTemplateEmail(
                    user.email,
                    template.emailTemplate,
                    enrichedData
                );
                console.log(`📧 [notifyUser] Email sent to ${user.email} (${template.emailTemplate})`);
            } catch (emailError) {
                console.error(`❌ [notifyUser] Email failed for ${user.email}:`, emailError.message);
                // No fallar si el email falla, continuar con la notificación
            }
        }

        // 3. Push notification ya está integrado en createNotification
        // (se envía automáticamente si el usuario tiene suscripción)

        return {
            success: true,
            notification,
            emailSent: shouldSendEmail,
            type
        };

    } catch (error) {
        console.error(`❌ [notifyUser] Error sending notification to ${userId}:`, error);
        throw error;
    }
};

/**
 * Envía notificación a múltiples usuarios
 * @param {Array<string>} userIds - Array de IDs de usuarios
 * @param {string} type - Tipo de notificación
 * @param {Object} data - Datos para la notificación
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Array>} Array de resultados
 */
const notifyMultipleUsers = async (userIds, type, data, options = {}) => {
    const results = await Promise.allSettled(
        userIds.map(userId => notifyUser(userId, type, data, options))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 [notifyMultipleUsers] ${successful} successful, ${failed} failed (${type})`);

    return results;
};

/**
 * Envía notificación a todos los administradores
 * @param {string} type - Tipo de notificación
 * @param {Object} data - Datos para la notificación
 * @param {Object} options - Opciones adicionales
 */
const notifyAllAdmins = async (type, data, options = {}) => {
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
    });

    const adminIds = admins.map(admin => admin.id);
    
    console.log(`📢 [notifyAllAdmins] Notifying ${adminIds.length} admins (${type})`);
    
    return notifyMultipleUsers(adminIds, type, data, options);
};

/**
 * Envía notificación a todos los managers de un departamento
 * @param {string} department - Departamento
 * @param {string} type - Tipo de notificación
 * @param {Object} data - Datos para la notificación
 * @param {Object} options - Opciones adicionales
 */
const notifyDepartmentManagers = async (department, type, data, options = {}) => {
    const managers = await prisma.user.findMany({
        where: { 
            role: 'MANAGER',
            department
        },
        select: { id: true }
    });

    const managerIds = managers.map(manager => manager.id);
    
    console.log(`📢 [notifyDepartmentManagers] Notifying ${managerIds.length} managers in ${department} (${type})`);
    
    return notifyMultipleUsers(managerIds, type, data, options);
};

module.exports = {
    notifyUser,
    notifyMultipleUsers,
    notifyAllAdmins,
    notifyDepartmentManagers,
    NOTIFICATION_TEMPLATES
};
