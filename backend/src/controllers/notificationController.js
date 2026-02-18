const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendPushToUser } = require('../services/pushService');

// Internal helper to create notifications
const createNotification = async (userId, title, message) => {
    try {
        console.log(`🔔 [NOTIFICATION] Creating notification for user ${userId}: ${title}`);
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                read: false,
                date: new Date()
            }
        });
        console.log(`✅ [NOTIFICATION] Notification created successfully for user ${userId}`);

        // Fire-and-forget push delivery if configured
        sendPushToUser(userId, {
            title,
            body: message,
            url: '/notifications'
        }).catch((err) => {
            console.error('❌ [NOTIFICATION] Error sending push notification:', err);
        });
    } catch (error) {
        console.error('❌ [NOTIFICATION] Error creating notification:', error);
    }
};

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`🔔 [NOTIFICATION] Fetching notifications for user ${userId}`);

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 20 // Limit to last 20
        });

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
        });

        console.log(`🔔 [NOTIFICATION] Found ${notifications.length} notifications, ${unreadCount} unread for user ${userId}`);

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('❌ [NOTIFICATION] Error getting notifications:', error);
        res.status(500).json({ error: 'Error getting notifications' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const result = await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error processing request' });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;
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

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Ensure user owns the notification
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.notification.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Error deleting notification' });
    }
};

module.exports = {
    createNotification, // Exported for internal use
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
