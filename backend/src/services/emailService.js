const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTransporter = async () => {
    try {
        console.log('📧 [DEBUG] Fetching SMTP settings from DB...');
        const settings = await prisma.globalSettings.findMany({
            where: {
                key: { in: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure'] }
            }
        });

        const config = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        // Log config presence (masking sensitive data)
        console.log('📧 [DEBUG] SMTP Config retrieved:', {
            host: config.smtpHost ? 'FOUND' : 'MISSING',
            port: config.smtpPort ? config.smtpPort : 'MISSING(Default:587)',
            user: config.smtpUser ? 'FOUND' : 'MISSING',
            pass: config.smtpPass ? 'FOUND' : 'MISSING',
            secure: config.smtpSecure
        });

        if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
            console.warn('⚠️ SMTP settings not configured: Missing Host, User, or Pass');
            return null;
        }

        const transportConfig = {
            host: config.smtpHost,
            port: parseInt(config.smtpPort) || 587,
            secure: config.smtpSecure === 'true', // true for 465, false for other ports
            auth: {
                user: config.smtpUser,
                pass: config.smtpPass,
            },
            tls: {
                rejectUnauthorized: false // Helps with some self-signed certs or strict firewalls
            }
        };

        // Create transporter
        const transporter = nodemailer.createTransport(transportConfig);

        // Verify connection logic
        try {
            await transporter.verify();
            console.log('✅ [DEBUG] SMTP Connection verified successfully');
            return transporter;
        } catch (verifyError) {
            console.error('❌ [DEBUG] SMTP Connection Verification Failed:', verifyError.message);
            return null; // Return null if connection fails
        }
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
    console.log(`📧 [EMAIL] Attempting to send ${templateType} to ${email}`);
    console.log(`📧 [EMAIL] Variables:`, JSON.stringify(variables, null, 2));

    const transporter = await getTransporter();
    if (!transporter) {
        console.error('❌ [EMAIL] SMTP transporter not configured. Check Admin > Settings');
        return false;
    }

    try {
        // Procesar plantilla con variables
        console.log(`📧 [EMAIL] Processing template: ${templateType}`);
        const processed = await processTemplate(templateType, variables);

        if (!processed) {
            console.error(`❌ [EMAIL] Template ${templateType} not found in database`);
            console.error(`❌ [EMAIL] Make sure default templates were created. Check EmailTemplate table.`);
            return false;
        }

        console.log(`📧 [EMAIL] Template processed successfully`);
        console.log(`📧 [EMAIL] Subject: ${processed.subject}`);

        // Get customized 'from' address or default
        const fromSetting = await prisma.globalSettings.findUnique({ where: { key: 'smtpFrom' } });
        const from = fromSetting?.value || '"Xyon Portal" <no-reply@xyon.com>';

        console.log(`📧 [EMAIL] Sending from: ${from}`);

        await transporter.sendMail({
            from,
            to: email,
            subject: processed.subject,
            html: processed.htmlBody
        });

        console.log(`✅ [EMAIL] Successfully sent ${templateType} to ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ [EMAIL] Failed to send ${templateType} to ${email}`);
        console.error(`❌ [EMAIL] Error:`, error.message);
        console.error(`❌ [EMAIL] Stack:`, error.stack);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendTemplateEmail
};
