const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// News Management
exports.createNews = async (req, res) => {
    try {
        const { title, summary, content, category, imageUrl } = req.body;
        const news = await prisma.newsItem.create({
            data: { title, summary, content, category, imageUrl }
        });
        res.status(201).json(news);
    } catch (error) {
        console.error("Create news error:", error);
        res.status(500).json({ error: 'Failed to create news' });
    }
};

exports.updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, summary, content, category, imageUrl } = req.body;
        const news = await prisma.newsItem.update({
            where: { id },
            data: { title, summary, content, category, imageUrl }
        });
        res.json(news);
    } catch (error) {
        console.error("Update news error:", error);
        res.status(500).json({ error: 'Failed to update news' });
    }
};

exports.deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.newsItem.delete({ where: { id } });
        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        console.error("Delete news error:", error);
        res.status(500).json({ error: 'Failed to delete news' });
    }
};

// Payroll Management (Admin)
exports.createPayroll = async (req, res) => {
    try {
        const { userId, month, year, amount, pdfUrl } = req.body;
        const payroll = await prisma.payroll.create({
            data: { userId, month, year, amount, pdfUrl, status: 'PAID' }
        });
        res.status(201).json(payroll);
    } catch (error) {
        console.error("Create payroll error:", error);
        res.status(500).json({ error: 'Failed to create payroll' });
    }
};

// Events Management
exports.getAllEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: {
                date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
            take: 10
        });
        res.json(events);
    } catch (error) {
        console.error("Get events error:", error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, location } = req.body;
        const event = await prisma.event.create({
            data: { title, description, date: new Date(date), location }
        });
        res.status(201).json(event);
    } catch (error) {
        console.error("Create event error:", error);
        res.status(500).json({ error: 'Failed to create event' });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.event.delete({ where: { id } });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error("Delete event error:", error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

// Holidays Management
exports.getNextHoliday = async (req, res) => {
    try {
        const today = new Date();
        const holiday = await prisma.holiday.findFirst({
            where: {
                date: { gte: today }
            },
            orderBy: { date: 'asc' }
        });
        res.json(holiday);
    } catch (error) {
        console.error("Get next holiday error:", error);
        res.status(500).json({ error: 'Failed to fetch holiday' });
    }
};
