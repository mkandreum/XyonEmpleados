const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { decryptWithInfo, encryptSMTPPassword, isEncrypted } = require('../utils/encryptionUtils');
const {
    COLORS, getBranding, renderEmail, renderParagraph, escapeHtml,
} = require('./emailLayout');

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
            console.warn('⚠️ SMTP settings not configured: Missing Host, User, or Pass');
            return null;
        }

        // Migracion automatica: si la password SMTP esta en texto plano (formato legacy),
        // guardarla cifrada en BD para no dejar el secreto en claro.
        const persistEncrypted = async (plain, logMessage) => {
            const encrypted = encryptSMTPPassword(plain);
            await prisma.globalSettings.upsert({
                where: { key: 'smtpPass' },
                update: { value: encrypted },
                create: { key: 'smtpPass', value: encrypted }
            });
            console.log(logMessage);
        };

        let decryptedPassword;
        if (!isEncrypted(config.smtpPass)) {
            decryptedPassword = config.smtpPass;
            try {
                await persistEncrypted(decryptedPassword, '🔒 SMTP password migrated to encrypted format');
            } catch (migrateError) {
                console.warn('⚠️ Could not migrate SMTP password to encrypted format:', migrateError.message);
            }
        } else {
            const { value, key } = decryptWithInfo(config.smtpPass);
            decryptedPassword = value;
            // Valor cifrado con una clave antigua (legacy o derivada de JWT_SECRET antes de
            // definir ENCRYPTION_KEY): guardarlo de nuevo con la clave actual.
            if (key !== 'primary') {
                try {
                    await persistEncrypted(value, `🔒 SMTP password re-encrypted with current key (was: ${key})`);
                } catch (reencryptError) {
                    console.warn('⚠️ Could not re-encrypt SMTP password:', reencryptError.message);
                }
            }
        }

        const transportConfig = {
            host: config.smtpHost,
            port: parseInt(config.smtpPort) || 587,
            secure: config.smtpSecure === 'true', // true for 465, false for other ports
            auth: {
                user: config.smtpUser,
                pass: decryptedPassword,
            },
            tls: {
                rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== 'true' // verificar certificado; SMTP_TLS_INSECURE=true solo para certs autofirmados
            }
        };

        // Create transporter
        const transporter = nodemailer.createTransport(transportConfig);

        // Verify connection logic (NON-BLOCKING)
        try {
            await transporter.verify();
            console.log('✅ [DEBUG] SMTP Connection verified successfully');
        } catch (verifyError) {
            console.warn('⚠️ [DEBUG] SMTP Connection Verification Warning:', verifyError.message);
            console.warn('⚠️ [DEBUG] Proceeding to return transporter anyway (Optimistic)');
            // Do NOT return null here, let sendMail try its best
        }

        return transporter;
    } catch (error) {
        console.error('Error configuring email transporter:', error);
        return null;
    }
};

const sendPasswordResetEmail = async (email, resetLink, opts = {}) => {
    const isInvite = !!opts.invite;
    const transporter = await getTransporter();
    if (!transporter) return false;

    // Get customized 'from' address or default
    const fromSetting = await prisma.globalSettings.findUnique({ where: { key: 'smtpFrom' } });
    const from = fromSetting?.value || '"Xyon Portal" <no-reply@xyon.com>';

    try {
        const branding = await getBranding();
        const html = renderEmail({
            branding,
            accent: COLORS.lilac,
            accentSoft: COLORS.lilacSoft,
            accentInk: COLORS.lilacInk,
            badge: isInvite ? 'Cuenta nueva' : 'Seguridad',
            title: isInvite ? 'Bienvenido a Xyon' : 'Restablecer contraseña',
            preheader: isInvite
                ? 'Establece la contraseña de tu cuenta de Xyon'
                : 'Enlace para restablecer tu contraseña de Xyon',
            intro: isInvite
                ? 'Se ha creado tu cuenta. Pulsa el botón para establecer tu contraseña y empezar a usar el portal.'
                : 'Has solicitado restablecer tu contraseña. Pulsa el botón para elegir una nueva.',
            content: renderParagraph(
                `<span style="color:${COLORS.slate500};font-size:13px;">` +
                (isInvite
                    ? 'El enlace expirará en 72 horas; después puedes usar "He olvidado mi contraseña".'
                    : 'Si no solicitaste este cambio, puedes ignorar este correo. El enlace expirará en 1 hora.') +
                '</span>'
            ),
            cta: { label: isInvite ? 'Establecer contraseña' : 'Restablecer contraseña', href: resetLink },
        });

        await transporter.sendMail({
            from,
            to: email,
            subject: isInvite ? 'Tu cuenta en Xyon - Establece tu contraseña' : 'Restablecer Contraseña - Xyon',
            html,
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
        const branding = await getBranding();
        const html = renderEmail({
            branding,
            accent: COLORS.lime,
            accentSoft: COLORS.limeSoft,
            accentInk: COLORS.limeInk,
            badge: 'Bienvenido',
            title: `¡Hola, ${escapeHtml(name)}!`,
            preheader: 'Tu cuenta de Xyon está lista',
            intro: 'Tu cuenta se ha creado correctamente. Ya puedes acceder al portal de empleados y consultar tus fichajes, solicitudes y novedades.',
        });

        await transporter.sendMail({
            from,
            to: email,
            subject: 'Bienvenido a Xyon',
            html,
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
