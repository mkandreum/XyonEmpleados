const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllNews = async (req, res) => {
    try {
        const news = await prisma.newsItem.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
};

exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { date: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.update({
            where: { id, userId: req.user.userId },
            data: { read: true }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
};
