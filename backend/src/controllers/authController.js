const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { describeClient } = require('../utils/requestInfo');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                position: true,
                avatarUrl: true,
                phone: true,
                address: true,
                emergencyContact: true,
                joinDate: true,
                active: true,
                createdAt: true,
            }
        });
        res.json(user);
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { phone, address, emergencyContact, avatarUrl, shiftReminderEmail } = req.body;
        // Solo URLs propias (/uploads/public/...) o https: evita esquemas javascript:/data:
        if (avatarUrl && !/^(\/uploads\/public\/|https:\/\/)/.test(avatarUrl)) {
            return res.status(400).json({ error: 'avatarUrl invalido' });
        }
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: { 
                phone, 
                address, 
                emergencyContact, 
                ...(avatarUrl && { avatarUrl }),
                ...(shiftReminderEmail !== undefined && { shiftReminderEmail })
            }
        });

        const { password: _, resetToken: _rt, resetTokenExpiry: _re, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, department, position, invitationCode } = req.body;

        // Verify Invitation Code
        if (!invitationCode) {
            return res.status(400).json({ error: 'Código de invitación requerido' });
        }

        const invite = await prisma.invitationCode.findUnique({
            where: { code: invitationCode }
        });

        if (!invite) {
            return res.status(400).json({ error: 'Código de invitación inválido' });
        }

        if (invite.isUsed) {
            return res.status(400).json({ error: 'Este código de invitación ya ha sido usado' });
        }
        
        // Validar expiración
        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            return res.status(400).json({ 
                error: 'Código de invitación expirado. Solicita uno nuevo al administrador.' 
            });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Get default avatar from settings
        const defaultAvatarSetting = await prisma.globalSettings.findUnique({
            where: { key: 'defaultAvatarUrl' }
        });
        const avatarUrl = defaultAvatarSetting?.value || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

        // Transaction to ensure User creation and Invite usage happen atomically
        const user = await prisma.$transaction(async (tx) => {
            // Re-verify invite code inside transaction
            const validInvite = await tx.invitationCode.findUnique({
                where: { code: invitationCode }
            });

            if (!validInvite || validInvite.isUsed) {
                throw new Error('INVITE_INVALID'); // Will be caught below
            }

            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    department: department || 'General',
                    position: position || 'Employee',
                    role: 'EMPLOYEE',
                    avatarUrl
                }
            });

            // Atomic claim: only succeeds if nobody used the code in the meantime
            const claimed = await tx.invitationCode.updateMany({
                where: { id: validInvite.id, isUsed: false },
                data: {
                    isUsed: true,
                    usedBy: newUser.email
                }
            });
            if (claimed.count !== 1) throw new Error('INVITE_INVALID');

            return newUser;
        });

        const { password: _, resetToken: _rt, resetTokenExpiry: _re, ...userWithoutPassword } = user;

        // Send welcome email (outside transaction)
        try {
            const { sendWelcomeEmail } = require('../services/emailService');
            sendWelcomeEmail(user.email, user.name).catch(console.error);
        } catch (e) {
            console.error('Email service not ready or failed', e);
        }

        const token = jwt.sign({ userId: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '1d', algorithm: 'HS256' });

        res.status(201).json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Comparar siempre contra un hash para no filtrar la existencia del usuario por timing
        const isValid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Solo se revela tras acreditar la contrasena (no permite enumerar cuentas)
        if (user.active === false) {
            return res.status(403).json({ error: 'Account disabled', code: 'ACCOUNT_DISABLED' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '1d', algorithm: 'HS256' });

        const { password: _, resetToken: _rt, resetTokenExpiry: _re, ...userWithoutPassword } = user;

        res.json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/** "daniel@empresa.com" -> "d***@empresa.com" (logs must not carry full addresses). */
const maskEmail = (e) => {
    const [user, domain] = String(e || '').split('@');
    return domain ? `${user.slice(0, 1)}***@${domain}` : '***';
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (typeof email !== 'string' || !email) {
            return res.status(400).json({ error: 'Email requerido' });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        const client = describeClient(req);
        console.log(
            `🔐 [PASSWORD RESET REQUEST] email=${maskEmail(email)} existe=${!!user && user.active !== false} ` +
            `ip=${client.ip} navegador="${client.browser}" so="${client.os}" dispositivo="${client.device}" ` +
            `tipo=${client.clientType} ua="${client.userAgent}"`
        );
        if (!user || user.active === false) {
            // Security: Do not reveal if email exists, but simulating success
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        // Cooldown: no reenviar si el enlace actual tiene menos de 10 minutos (el token
        // caduca a la hora, asi que se infiere la antiguedad desde resetTokenExpiry).
        // Evita bombardeo de emails y que reintentos seguidos invaliden el enlace anterior.
        const RESET_TOKEN_TTL_MS = 3600000;
        const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
        if (user.resetToken && user.resetTokenExpiry &&
            user.resetTokenExpiry.getTime() - Date.now() > RESET_TOKEN_TTL_MS - RESEND_COOLDOWN_MS) {
            console.log(`⏳ [PASSWORD RESET COOLDOWN] email=${maskEmail(email)} ip=${client.ip} — reenvio omitido, el enlace actual es reciente`);
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hash = await bcrypt.hash(resetToken, 10);
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hash,
                resetTokenExpiry: expiry
            }
        });

        const { sendPasswordResetEmail } = require('../services/emailService');
        // Use environment variable or default to localhost
        const frontendUrl = process.env.FRONTEND_URL || 'https://portalempleado.xyoncloud.win';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        try {
            await sendPasswordResetEmail(user.email, resetLink);
        } catch (mailErr) {
            console.error('Password reset email failed:', mailErr.message);
        }

        res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: 'Error processing request' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;
        if (typeof token !== 'string' || typeof email !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Invalid request' });
        }
        if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 12 caracteres, con mayúsculas, minúsculas, un número y un símbolo' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.resetToken || !user.resetTokenExpiry) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        if (new Date() > user.resetTokenExpiry) {
            return res.status(400).json({ error: 'Token expired' });
        }

        const isValid = await bcrypt.compare(token, user.resetToken);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        const client = describeClient(req);
        console.log(
            `🔐 [PASSWORD RESET DONE] email=${maskEmail(email)} ` +
            `ip=${client.ip} navegador="${client.browser}" so="${client.os}" dispositivo="${client.device}" ` +
            `tipo=${client.clientType} ua="${client.userAgent}"`
        );

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: 'Error resetting password' });
    }
};


