const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            where: { userId: req.user.userId },
            orderBy: [
                { year: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(payrolls);
    } catch (error) {
        console.error('Get payrolls error:', error);
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
};
