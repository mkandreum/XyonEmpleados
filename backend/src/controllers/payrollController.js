const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            where: { userId: req.user.userId },
            orderBy: { year: 'desc', month: 'desc' } // Note: month sort might be tricky if string, but keeping simple
        });
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
};
