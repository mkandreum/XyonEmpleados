const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { createNotification } = require('./notificationController');
const { updateUserBalanceLogic } = require('./benefitsController');
const { sendTemplateEmail } = require('../services/emailService');

const ensureDepartmentSetting = async (department) => {
    if (!department) return;

    const existing = await prisma.globalSettings.findUnique({
        where: { key: 'DEPARTMENTS' }
    });

    let departments = [];
    if (existing?.value) {
        try {
            const parsed = JSON.parse(existing.value);
            if (Array.isArray(parsed)) {
                departments = parsed;
            }
        } catch (error) {
            console.error('Error parsing departments setting:', error);
        }
    }

    if (!departments.includes(department)) {
        const updated = [...departments, department];
        await prisma.globalSettings.upsert({
            where: { key: 'DEPARTMENTS' },
            update: { value: JSON.stringify(updated) },
            create: { key: 'DEPARTMENTS', value: JSON.stringify(updated) }
        });
    }
};

// --- User Management ---

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                position: true,
                createdAt: true,
                // Exclude sensitive data specifically, though select does this by inclusion
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, position, joinDate } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'EMPLOYEE',
                department: department || 'General',
                position: position || 'Employee',
                joinDate: joinDate ? new Date(joinDate) : new Date(),
                avatarUrl: req.body.avatarUrl || await (async () => {
                    // Try to get default avatar from settings
                    const defaultAvatarSetting = await prisma.globalSettings.findUnique({
                        where: { key: 'defaultAvatarUrl' }
                    });
                    if (defaultAvatarSetting) return defaultAvatarSetting.value;

                    return null; // No default avatar
                })()
            }
        });

        await ensureDepartmentSetting(user.department);

        const { password: _, ...userNoPass } = user;
        res.status(201).json(userNoPass);
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, department, position, joinDate, avatarUrl } = req.body;
        // Note: Password update should probably be a separate secure endpoint or handled carefully

        const updateData = { name, email, role, department, position };
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        if (joinDate) {
            updateData.joinDate = new Date(joinDate);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        await ensureDepartmentSetting(user.department);

        const { password: _, ...userNoPass } = user;
        res.json(userNoPass);
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.importUsers = async (req, res) => {
    try {
        const users = req.body;
        if (!Array.isArray(users)) {
            return res.status(400).json({ error: 'Input must be an array' });
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (const user of users) {
            try {
                if (await prisma.user.findUnique({ where: { email: user.email } })) {
                    results.failed++;
                    results.errors.push(`${user.email}: Exists`);
                    continue;
                }
                const hashedPassword = await bcrypt.hash(user.password || 'default123', 10);
                await prisma.user.create({
                    data: {
                        name: user.name,
                        email: user.email,
                        password: hashedPassword,
                        role: user.role || 'EMPLOYEE',
                        department: user.department || 'General',
                        position: user.position || 'Employee',
                        joinDate: user.joinDate ? new Date(user.joinDate) : new Date(),
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`
                    }
                });
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`${user.email}: ${err.message}`);
            }
        }
        res.json({ message: 'Import completed', results });
    } catch (error) {
        console.error("Bulk import error:", error);
        res.status(500).json({ error: 'Failed to import users' });
    }
};

// --- Vacation Management ---

exports.getAllVacations = async (req, res) => {
    try {
        const vacations = await prisma.vacationRequest.findMany({
            include: {
                user: {
                    select: { name: true, email: true, department: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(vacations);
    } catch (error) {
        console.error("Get admin vacations error:", error);
        res.status(500).json({ error: 'Failed to fetch vacations' });
    }
};

exports.updateVacationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED', 'REJECTED'

        const vacation = await prisma.vacationRequest.update({
            where: { id },
            data: { status },
            include: {
                user: {
                    select: { email: true, name: true }
                }
            }
        });

        if (status === 'APPROVED') {
            try {
                await updateUserBalanceLogic(vacation.userId, vacation.type, vacation.days, vacation.hours, vacation.subtype);
            } catch (err) {
                console.error("Failed to update user balance on approval:", err);
                // Don't fail the request, but log error. Maybe notify admin?
            }
        }

        // NOTIFICATION: Notify User
        let title = 'Actualización de Solicitud';
        let message = `El estado de tu solicitud ha cambiado a: ${status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'}`;

        await createNotification(
            vacation.userId,
            title,
            message
        );

        // 🔔 ENVIAR EMAIL AL EMPLEADO
        const getTypeLabel = (t, st) => {
            switch (t) {
                case 'VACATION': return 'Vacaciones';
                case 'SICK_LEAVE': return 'Baja Médica';
                case 'PERSONAL': return 'Asuntos Propios';
                case 'OVERTIME': return 'Horas Exceso';
                case 'OTHER': return st || 'Otros Permisos';
                default: return t;
            }
        };

        const emailVariables = {
            employeeName: vacation.user.name,
            requestType: getTypeLabel(vacation.type, vacation.subtype),
            startDate: new Date(vacation.startDate).toLocaleDateString('es-ES'),
            endDate: new Date(vacation.endDate).toLocaleDateString('es-ES'),
            days: vacation.days ? vacation.days.toString() : (vacation.hours + ' horas'),
            reason: status === 'REJECTED' ? 'El administrador ha rechazado la solicitud' : ''
        };

        const templateType = status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
        await sendTemplateEmail(vacation.user.email, templateType, emailVariables);

        res.json(vacation);
    } catch (error) {
        console.error("Update vacation status error:", error);
        res.status(500).json({ error: 'Failed to update vacation status' });
    }
};

// --- Global Settings ---

exports.getSettings = async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findMany();
        // Convert array to object for easier frontend consumption
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        console.log('📤 Sending settings to frontend:', settingsObj);
        res.json(settingsObj);
    } catch (error) {
        console.error("Get settings error:", error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body; // Expects object like { logoUrl: '...', companyName: '...', defaultAvatarUrl: '...' }
        const keys = Object.keys(settings);

        // Upsert each setting
        const promises = keys.map(key =>
            prisma.globalSettings.upsert({
                where: { key },
                update: { value: settings[key] },
                create: { key, value: settings[key] }
            })
        );

        await Promise.all(promises);

        // If defaultAvatarUrl was updated, apply it to all users who are using ui-avatars
        if (settings.defaultAvatarUrl) {
            await prisma.user.updateMany({
                where: {
                    OR: [
                        { avatarUrl: { startsWith: 'https://ui-avatars.com' } },
                        { avatarUrl: null }
                    ]
                },
                data: {
                    avatarUrl: settings.defaultAvatarUrl
                }
            });
            console.log('✅ Updated all users with default avatar:', settings.defaultAvatarUrl);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// --- Payroll Management ---

exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            include: {
                user: {
                    select: { name: true, email: true, department: true }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.json(payrolls);
    } catch (error) {
        console.error("Get admin payrolls error:", error);
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
};

exports.deletePayroll = async (req, res) => {
    try {
        const { id } = req.params;
        // In a real app, we should also delete the file from storage (uploadController logic)
        // For now, we just delete the database record.
        await prisma.payroll.delete({ where: { id } });
        res.json({ message: 'Payroll deleted successfully' });
    } catch (error) {
        console.error("Delete payroll error:", error);
        res.status(500).json({ error: 'Failed to delete payroll' });
    }
};

// --- Invitation Codes ---

exports.getInviteCodes = async (req, res) => {
    try {
        const codes = await prisma.invitationCode.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(codes);
    } catch (error) {
        console.error("Get invite codes error:", error);
        res.status(500).json({ error: 'Failed to fetch invite codes' });
    }
};

const crypto = require('crypto');

exports.generateInviteCode = async (req, res) => {
    try {
        // Generate a cryptographically strong random code (8 chars hex)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();

        const invite = await prisma.invitationCode.create({
            data: {
                code
            }
        });
        res.status(201).json(invite);
    } catch (error) {
        if (error.code === 'P2002') {
            // Rare collision
            return res.status(409).json({ error: 'Code collision, please try again' });
        }
        console.error("Generate invite code error:", error);
        res.status(500).json({ error: 'Failed to generate invite code' });
    }
};

exports.revokeInviteCode = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.invitationCode.delete({ where: { id } });
        res.json({ message: 'Invitation code revoked' });
    } catch (error) {
        console.error("Revoke invite code error:", error);
        res.status(500).json({ error: 'Failed to revoke invite code' });
    }
};
