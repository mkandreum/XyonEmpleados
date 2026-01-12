const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, variables[key] || '');
    });

    return result;
};

/**
 * Procesar plantilla con variables
 */
const processTemplate = async (type, variables) => {
    const template = await getTemplateByType(type);

    if (!template) {
        console.warn(`⚠️ Template ${type} not found, using fallback`);
        return null;
    }

    return {
        subject: replaceVariables(template.subject, variables),
        htmlBody: replaceVariables(template.htmlBody, variables)
    };
};

/**
 * Crear plantillas por defecto si no existen
 */
const createDefaultTemplates = async () => {
    const defaultTemplates = [
        {
            type: 'LATE_ARRIVAL',
            name: 'Aviso de Llegada Tarde',
            subject: 'Aviso de Llegada Tarde - {{date}}',
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Aviso de Llegada Tarde</h2>
                    <p>Hola <strong>{{employeeName}}</strong>,</p>
                    <p>Tu manager <strong>{{managerName}}</strong> ha registrado una llegada tarde el día <strong>{{date}}</strong> a las <strong>{{time}}</strong>.</p>
                    <p>Por favor, justifica tu llegada tarde accediendo al portal de empleados.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280;">
                        Este es un mensaje automático del sistema de gestión de empleados.
                    </p>
                </div>
            `,
            variables: JSON.stringify(['employeeName', 'managerName', 'date', 'time'])
        },
        {
            type: 'CLOCKING_WARNING',
            name: 'Aviso de Problema con Fichaje',
            subject: 'Aviso de Fichaje - {{date}}',
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #f59e0b;">Aviso de Fichaje</h2>
                    <p>Hola <strong>{{employeeName}}</strong>,</p>
                    <p>Se ha detectado un problema con tu fichaje del día <strong>{{date}}</strong>.</p>
                    <p><strong>Detalle:</strong> {{details}}</p>
                    <p>Por favor, revisa tu registro de fichajes y contacta con tu manager si es necesario.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280;">
                        Este es un mensaje automático del sistema de gestión de empleados.
                    </p>
                </div>
            `,
            variables: JSON.stringify(['employeeName', 'date', 'details'])
        },
        {
            type: 'REQUEST_APPROVED',
            name: 'Solicitud Aprobada',
            subject: '✅ Tu solicitud ha sido aprobada',
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10b981;">¡Solicitud Aprobada!</h2>
                    <p>Hola <strong>{{employeeName}}</strong>,</p>
                    <p>Tu solicitud de <strong>{{requestType}}</strong> ha sido aprobada.</p>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Tipo:</strong> {{requestType}}</p>
                        <p style="margin: 5px 0;"><strong>Fecha inicio:</strong> {{startDate}}</p>
                        <p style="margin: 5px 0;"><strong>Fecha fin:</strong> {{endDate}}</p>
                        <p style="margin: 5px 0;"><strong>Días:</strong> {{days}}</p>
                    </div>
                    <p>Ya puedes consultar los detalles en el portal de empleados.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280;">
                        Este es un mensaje automático del sistema de gestión de empleados.
                    </p>
                </div>
            `,
            variables: JSON.stringify(['employeeName', 'requestType', 'startDate', 'endDate', 'days'])
        },
        {
            type: 'REQUEST_REJECTED',
            name: 'Solicitud Rechazada',
            subject: '❌ Tu solicitud ha sido rechazada',
            htmlBody: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Solicitud Rechazada</h2>
                    <p>Hola <strong>{{employeeName}}</strong>,</p>
                    <p>Lamentamos informarte que tu solicitud de <strong>{{requestType}}</strong> ha sido rechazada.</p>
                    <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Tipo:</strong> {{requestType}}</p>
                        <p style="margin: 5px 0;"><strong>Fecha inicio:</strong> {{startDate}}</p>
                        <p style="margin: 5px 0;"><strong>Fecha fin:</strong> {{endDate}}</p>
                        <p style="margin: 5px 0;"><strong>Motivo:</strong> {{reason}}</p>
                    </div>
                    <p>Si tienes alguna duda, por favor contacta con tu manager o el departamento de RRHH.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280;">
                        Este es un mensaje automático del sistema de gestión de empleados.
                    </p>
                </div>
            `,
            variables: JSON.stringify(['employeeName', 'requestType', 'startDate', 'endDate', 'reason'])
        }
    ];

    for (const template of defaultTemplates) {
        try {
            const existing = await prisma.emailTemplate.findUnique({
                where: { type: template.type }
            });

            if (!existing) {
                await prisma.emailTemplate.create({ data: template });
                console.log(`✅ Created default template: ${template.type}`);
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
    createDefaultTemplates
};
