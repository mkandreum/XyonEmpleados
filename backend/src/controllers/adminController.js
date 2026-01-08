const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { createNotification } = require('./notificationController');

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
                avatarUrl: await (async () => {
                    // Try to get default avatar from settings
                    const defaultAvatarSetting = await prisma.globalSettings.findUnique({
                        where: { key: 'defaultAvatarUrl' }
                    });
                    if (defaultAvatarSetting) return defaultAvatarSetting.value;

                    // Fallback to UI Avatars
                    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                })()
            }
        });

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
        const { name, email, role, department, position, joinDate } = req.body;
        // Note: Password update should probably be a separate secure endpoint or handled carefully

        const updateData = { name, email, role, department, position };
        if (joinDate) {
            updateData.joinDate = new Date(joinDate);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

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
            data: { status }
        });

        // NOTIFICATION: Notify User
        let title = 'Actualización de Solicitud';
        let message = `El estado de tu solicitud ha cambiado a: ${status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'}`;

        await createNotification(
            vacation.userId,
            title,
            message
        );

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
        res.json(settingsObj);
    } catch (error) {
        console.error("Get settings error:", error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body; // Expects object like { logoUrl: '...', companyName: '...' }
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
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
