const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/user-shift-assignments
 * Asigna un turno a un usuario para una fecha
 * Body: { userId, shiftId, date }
 */
exports.assignShift = async (req, res) => {
    try {
        const { userId, shiftId, date } = req.body;
        if (!userId || !shiftId || !date) {
            return res.status(400).json({ error: 'userId, shiftId y date son obligatorios' });
        }
        const assignment = await prisma.userShiftAssignment.upsert({
            where: { userId_date: { userId, date: new Date(date) } },
            update: { shiftId },
            create: { userId, shiftId, date: new Date(date) }
        });
        res.json(assignment);
    } catch (error) {
        console.error('Error asignando turno:', error);
        res.status(500).json({ error: 'Error asignando turno' });
    }
};

/**
 * GET /api/user-shift-assignments?userId=...&month=...&year=...
 * Devuelve los turnos asignados de un usuario para un mes
 */
exports.getUserShifts = async (req, res) => {
    try {
        const { userId, month, year } = req.query;
        if (!userId || !month || !year) {
            return res.status(400).json({ error: 'userId, month y year son obligatorios' });
        }
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        const shifts = await prisma.userShiftAssignment.findMany({
            where: {
                userId,
                date: { gte: start, lte: end }
            },
            include: { shift: true }
        });
        res.json(shifts);
    } catch (error) {
        console.error('Error obteniendo turnos:', error);
        res.status(500).json({ error: 'Error obteniendo turnos' });
    }
};
