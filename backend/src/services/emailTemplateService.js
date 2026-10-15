const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');
const {
    COLORS, renderEmail, renderParagraph, renderInfoBox, isLegacyDefault,
} = require('./emailLayout');

/**
 * Obtener plantilla por tipo
 */
const getTemplateByType = async (type) => {
    try {
        const template = await prisma.emailTemplate.findUnique({
            where: { type, isActive: true }
        });
        return template;
    } catch (error) {
        console.error(`Error getting template ${type}:`, error);
        return null;
    }
};

/**
 * Reemplazar variables en el texto
 * Ejemplo: "Hola {{employeeName}}" con {employeeName: "Juan"} => "Hola Juan"
 */
const replaceVariables = (text, variables) => {
    if (!text) return text;

    let result = text;
    Object.keys(variables).forEach(key => {
        const safeKey = key.replace(/\W/g, '');
        const regex = new RegExp(`{{${safeKey}}}`, 'g');
        // Escapar HTML: los valores (nombres, motivos) los controlan los usuarios
        const value = String(variables[key] ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        result = result.replace(regex, () => value);
    });

    return result;
};

/**
 * Validar que todas las variables requeridas estén presentes
 * @param {string} templateType - Tipo de plantilla
 * @param {Array<string>} requiredVars - Variables requeridas
 * @param {Object} providedVars - Variables proporcionadas
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
const validateTemplateVariables = (templateType, requiredVars, providedVars) => {
    if (!requiredVars || requiredVars.length === 0) {
        return { valid: true, missing: [] };
    }

    const providedKeys = Object.keys(providedVars || {});
    const missing = requiredVars.filter(varName => !providedKeys.includes(varName));

    if (missing.length > 0) {
        console.warn(`⚠️ Template ${templateType} missing variables:`, missing);
        return { valid: false, missing };
    }

    return { valid: true, missing: [] };
};

/**
 * Schema de variables por tipo de template
 * Define qué variables son requeridas para cada tipo
 */
const TEMPLATE_VARIABLE_SCHEMAS = {
    'LATE_ARRIVAL': {
        required: ['employeeName', 'managerName', 'date', 'time'],
        optional: [],
        description: 'Notificación de llegada tarde enviada al empleado'
    },
    'CLOCKING_WARNING': {
        required: ['employeeName', 'date', 'details'],
        optional: [],
        description: 'Aviso de problema con fichaje'
    },
    'REQUEST_APPROVED': {
        required: ['employeeName', 'requestType', 'startDate', 'endDate', 'days'],
        optional: ['reason'],
        description: 'Confirmación de aprobación de solicitud (vacaciones, permisos, etc.)'
    },
    'REQUEST_REJECTED': {
        required: ['employeeName', 'requestType', 'startDate', 'endDate', 'reason'],
        optional: [],
        description: 'Notificación de rechazo de solicitud'
    }
};

/**
 * Procesar plantilla con variables
 * Ahora incluye validación de variables requeridas
 */
const processTemplate = async (type, variables) => {
    const template = await getTemplateByType(type);

    if (!template) {
        console.warn(`⚠️ Template ${type} not found, using fallback`);
        return null;
    }

    // Validar variables requeridas usando el schema
    const schema = TEMPLATE_VARIABLE_SCHEMAS[type];
    if (schema) {
        const validation = validateTemplateVariables(type, schema.required, variables);
        if (!validation.valid) {
            const error = `Missing required variables for ${type}: ${validation.missing.join(', ')}`;
            console.error(`❌ ${error}`);
            throw new Error(error);
        }
    } else {
        console.warn(`⚠️ No schema defined for template ${type}, skipping validation`);
    }

    return {
        subject: replaceVariables(template.subject, variables),
        htmlBody: replaceVariables(template.htmlBody, variables)
    };
};

/**
 * Cuerpos HTML tematizados por defecto (coherentes con el diseño de la app).
 * Se construyen con emailLayout.renderEmail para que mantengan la misma identidad
 * visual que el resto de correos de la plataforma.
 */
const buildDefaultHtml = (type) => {
    switch (type) {
        case 'LATE_ARRIVAL':
            return renderEmail({
                accent: COLORS.coral, accentSoft: COLORS.coralSoft, accentInk: COLORS.coralInk,
                badge: 'Asistencia',
                title: 'Aviso de llegada tarde',
                preheader: 'Se ha registrado una llegada tarde',
                intro: 'Hola <strong>{{employeeName}}</strong>, tu manager <strong>{{managerName}}</strong> ha registrado una llegada tarde.',
                content: renderInfoBox([
                    { label: 'Fecha', value: '{{date}}' },
                    { label: 'Hora', value: '{{time}}' },
                ]) + renderParagraph('Por favor, justifica tu llegada tarde accediendo al portal de empleados.'),
            });
        case 'CLOCKING_WARNING':
            return renderEmail({
                accent: COLORS.sun, accentSoft: COLORS.sunSoft, accentInk: COLORS.sunInk,
                badge: 'Fichaje',
                title: 'Aviso de fichaje',
                preheader: 'Revisa tu registro de fichajes',
                intro: 'Hola <strong>{{employeeName}}</strong>, se ha detectado un problema con tu fichaje del día <strong>{{date}}</strong>.',
                content: renderInfoBox([
                    { label: 'Fecha', value: '{{date}}' },
                    { label: 'Detalle', value: '{{details}}' },
                ]) + renderParagraph('Por favor, revisa tu registro de fichajes y contacta con tu manager si es necesario.'),
            });
        case 'REQUEST_APPROVED':
            return renderEmail({
                accent: COLORS.lime, accentSoft: COLORS.limeSoft, accentInk: COLORS.limeInk,
                badge: 'Aprobada',
                title: '¡Solicitud aprobada!',
                preheader: 'Tu solicitud ha sido aprobada',
                intro: 'Hola <strong>{{employeeName}}</strong>, tu solicitud de <strong>{{requestType}}</strong> ha sido aprobada.',
                content: renderInfoBox([
                    { label: 'Tipo', value: '{{requestType}}' },
                    { label: 'Fecha inicio', value: '{{startDate}}' },
                    { label: 'Fecha fin', value: '{{endDate}}' },
                    { label: 'Días', value: '{{days}}' },
                ]) + renderParagraph('Ya puedes consultar los detalles en el portal de empleados.'),
            });
        case 'REQUEST_REJECTED':
            return renderEmail({
                accent: COLORS.coral, accentSoft: COLORS.coralSoft, accentInk: COLORS.coralInk,
                badge: 'Rechazada',
                title: 'Solicitud rechazada',
                preheader: 'Tu solicitud ha sido rechazada',
                intro: 'Hola <strong>{{employeeName}}</strong>, lamentamos informarte que tu solicitud de <strong>{{requestType}}</strong> ha sido rechazada.',
                content: renderInfoBox([
                    { label: 'Tipo', value: '{{requestType}}' },
                    { label: 'Fecha inicio', value: '{{startDate}}' },
                    { label: 'Fecha fin', value: '{{endDate}}' },
                    { label: 'Motivo', value: '{{reason}}' },
                ]) + renderParagraph('Si tienes alguna duda, por favor contacta con tu manager o el departamento de RRHH.'),
            });
        default:
            return null;
    }
};

const DEFAULT_TEMPLATE_META = {
    LATE_ARRIVAL: {
        name: 'Aviso de Llegada Tarde',
        subject: 'Aviso de Llegada Tarde - {{date}}',
        variables: ['employeeName', 'managerName', 'date', 'time'],
    },
    CLOCKING_WARNING: {
        name: 'Aviso de Problema con Fichaje',
        subject: 'Aviso de Fichaje - {{date}}',
        variables: ['employeeName', 'date', 'details'],
    },
    REQUEST_APPROVED: {
        name: 'Solicitud Aprobada',
        subject: '✅ Tu solicitud ha sido aprobada',
        variables: ['employeeName', 'requestType', 'startDate', 'endDate', 'days'],
    },
    REQUEST_REJECTED: {
        name: 'Solicitud Rechazada',
        subject: '❌ Tu solicitud ha sido rechazada',
        variables: ['employeeName', 'requestType', 'startDate', 'endDate', 'reason'],
    },
};

const buildDefaultTemplates = () =>
    Object.entries(DEFAULT_TEMPLATE_META).map(([type, meta]) => ({
        type,
        name: meta.name,
        subject: meta.subject,
        htmlBody: buildDefaultHtml(type),
        variables: JSON.stringify(meta.variables),
    }));

/**
 * Crear plantillas por defecto si no existen.
 * Además, actualiza a la versión tematizada las plantillas por defecto antiguas
 * (legacy) que todavía no lleven la marca de tema. No toca plantillas ya
 * personalizadas que ya tengan la marca.
 */
const createDefaultTemplates = async () => {
    const defaultTemplates = buildDefaultTemplates();

    for (const template of defaultTemplates) {
        try {
            const existing = await prisma.emailTemplate.findUnique({
                where: { type: template.type }
            });

            if (!existing) {
                await prisma.emailTemplate.create({ data: template });
                console.log(`✅ Created default template: ${template.type}`);
            } else if (isLegacyDefault(existing.htmlBody)) {
                await prisma.emailTemplate.update({
                    where: { type: template.type },
                    data: { subject: template.subject, htmlBody: template.htmlBody },
                });
                console.log(`🎨 Re-themed legacy default template: ${template.type}`);
            }
        } catch (error) {
            console.error(`Error creating template ${template.type}:`, error);
        }
    }
};

module.exports = {
    getTemplateByType,
    replaceVariables,
    processTemplate,
    createDefaultTemplates,
    validateTemplateVariables,
    TEMPLATE_VARIABLE_SCHEMAS
};
