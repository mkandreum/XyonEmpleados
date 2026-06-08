const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { replaceVariables } = require('../services/emailTemplateService');

/**
 * GET /api/email-templates
 * Obtener todas las plantillas
 */
exports.getAll = async (req, res) => {
    try {
        const templates = await prisma.emailTemplate.findMany({
            orderBy: { type: 'asc' }
        });
        res.json(templates);
    } catch (error) {
        console.error('Error getting email templates:', error);
        res.status(500).json({ error: 'Error al obtener plantillas' });
    }
};

/**
 * GET /api/email-templates/:id
 * Obtener plantilla específica
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.emailTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        res.json(template);
    } catch (error) {
        console.error('Error getting email template:', error);
        res.status(500).json({ error: 'Error al obtener plantilla' });
    }
};

/**
 * PUT /api/email-templates/:id
 * Actualizar plantilla
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subject, htmlBody, isActive } = req.body;

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                name,
                subject,
                htmlBody,
                isActive
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
};

/**
 * POST /api/email-templates/preview
 * Previsualizar plantilla con datos de ejemplo
 */
exports.preview = async (req, res) => {
    try {
        const { subject, htmlBody, variables } = req.body;

        // Datos de ejemplo para previsualización
        const exampleData = {
            employeeName: 'Juan Pérez',
            managerName: 'María García',
            date: new Date().toLocaleDateString('es-ES'),
            time: '09:15',
            requestType: 'Vacaciones',
            startDate: '15/01/2026',
            endDate: '20/01/2026',
            days: '5',
            reason: 'Motivo de ejemplo',
            details: 'Detalles de ejemplo'
        };

        const processedSubject = replaceVariables(subject, exampleData);
        const processedBody = replaceVariables(htmlBody, exampleData);

        res.json({
            subject: processedSubject,
            htmlBody: processedBody
        });
    } catch (error) {
        console.error('Error previewing email template:', error);
        res.status(500).json({ error: 'Error al previsualizar plantilla' });
    }
};
