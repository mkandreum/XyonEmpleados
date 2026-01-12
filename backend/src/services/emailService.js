const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTransporter = async () => {
    try {
        const settings = await prisma.globalSettings.findMany({
            where: {
                key: { in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure'] }
            }
        });

        const config = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
            console.warn('⚠️ SMTP settings not configured');
            return null;
        }

        return nodemailer.createTransport({
            host: config.smtpHost,
            port: parseInt(config.smtpPort) || 587,
            secure: config.smtpSecure === 'true', // true for 465, false for other ports
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
        });
    } catch (error) {
        console.error('Error configuring email transporter:', error);
        return null;
    }
};

const sendPasswordResetEmail = async (email, resetLink) => {
    const transporter = await getTransporter();
    if (!transporter) return false;

    // Get customized 'from' address or default
    const fromSetting = await prisma.globalSettings.findUnique({ where: { key: 'smtpFrom' } });
    const from = fromSetting?.value || '"Xyon Portal" <no-reply@xyon.com>';

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Restablecer Contraseña - Xyon Portal',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Restablecer Contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
                    <p>
                        <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Restablecer Contraseña
                        </a>
                    </p>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Si no solicitaste este cambio, puedes ignorar este correo. El enlace expirará en 1 hora.
                    </p>
                </div>
            `
        });
        console.log(`Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendWelcomeEmail = async (email, name) => {
    const transporter = await getTransporter();
    if (!transporter) return false;

    const fromSetting = await prisma.globalSettings.findUnique({ where: { key: 'smtpFrom' } });
    const from = fromSetting?.value || '"Xyon Portal" <no-reply@xyon.com>';

    try {
        await transporter.sendMail({
            from,
            to: email,
            subject: 'Bienvenido a Xyon Portal',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>¡Bienvenido, ${name}!</h2>
                    <p>Tu cuenta ha sido creada exitosamente. Ya puedes acceder al portal de empleados.</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};

const { processTemplate } = require('./emailTemplateService');

/**
 * Enviar email usando plantilla
 * @param {string} email - Email del destinatario
 * @param {string} templateType - Tipo de plantilla (LATE_ARRIVAL, REQUEST_APPROVED, etc.)
 * @param {object} variables - Variables para reemplazar en la plantilla
 */
const sendTemplateEmail = async (email, templateType, variables) => {
    const transporter = await getTransporter();
    if (!transporter) {
        console.warn('⚠️ Email transporter not configured, skipping email');
        return false;
    }

    try {
        // Procesar plantilla con variables
        const processed = await processTemplate(templateType, variables);

        if (!processed) {
            console.warn(`⚠️ Template ${templateType} not found, email not sent`);
            return false;
        }

        // Get customized 'from' address or default
        const fromSetting = await prisma.globalSettings.findUnique({ where: { key: 'smtpFrom' } });
        const from = fromSetting?.value || '"Xyon Portal" <no-reply@xyon.com>';

        await transporter.sendMail({
            from,
            to: email,
            subject: processed.subject,
            html: processed.htmlBody
        });

        console.log(`✅ Template email sent to ${email} (${templateType})`);
        return true;
    } catch (error) {
        console.error('Error sending template email:', error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendTemplateEmail
};
