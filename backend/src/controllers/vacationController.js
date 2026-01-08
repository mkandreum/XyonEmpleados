const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllVacations = async (req, res) => {
    try {
        const vacations = await prisma.vacationRequest.findMany({
            where: { userId: req.user.userId },
            orderBy: { startDate: 'desc' }
        });
        res.json(vacations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vacations' });
    }
};

exports.createVacation = async (req, res) => {
    try {
        const { startDate, endDate, days, type, justificationUrl } = req.body;
        const request = await prisma.vacationRequest.create({
            data: {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                days,
                type,
                justificationUrl: justificationUrl || null,
                userId: req.user.userId,
                status: 'PENDING'
            }
        });
        res.json(request);
    } catch (error) {
        console.error("Create vacation error:", error);
        res.status(500).json({ error: 'Failed to create vacation request' });
    }
};
