const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}

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
        const { phone, address, emergencyContact, avatarUrl } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: { phone, address, emergencyContact, ...(avatarUrl && { avatarUrl }) }
        });

        const { password: _, ...userWithoutPassword } = user;
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

        const hashedPassword = await bcrypt.hash(newPassword, 10);
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

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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

            await tx.invitationCode.update({
                where: { id: validInvite.id },
                data: {
                    isUsed: true,
                    usedBy: newUser.email
                }
            });

            return newUser;
        });

        const { password: _, ...userWithoutPassword } = user;

        // Send welcome email (outside transaction)
        try {
            const { sendWelcomeEmail } = require('../services/emailService');
            sendWelcomeEmail(user.email, user.name).catch(console.error);
        } catch (e) {
            console.error('Email service not ready or failed', e);
        }

        const token = jwt.sign({ userId: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '1d' });

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

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '1d' });

        const { password: _, ...userWithoutPassword } = user;

        res.json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Security: Do not reveal if email exists, but simulating success
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

        await sendPasswordResetEmail(user.email, resetLink);

        res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ error: 'Error processing request' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

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

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: 'Error resetting password' });
    }
};


