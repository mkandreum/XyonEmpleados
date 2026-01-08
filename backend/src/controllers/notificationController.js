const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Internal helper to create notifications
const createNotification = async (userId, title, message) => {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                read: false,
                date: new Date()
            }
        });
        console.log(`Notification created for user ${userId}: ${title}`);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 20 // Limit to last 20
        });

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: 'Error getting notifications' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
};

module.exports = {
    createNotification, // Exported for internal use
    getNotifications,
    markAsRead,
    markAllAsRead
};
