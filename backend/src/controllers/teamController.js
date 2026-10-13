const prisma = require('../lib/prisma');
const { groupFichajesByDay } = require('../utils/fichajeUtils');
const { isValidDateStr } = require('../services/scheduleOverrideService');

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/** Lunes (YYYY-MM-DD) de la semana de una fecha. */
function mondayOf(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dow = d.getUTCDay(); // 0 = domingo
    return addDays(dateStr, dow === 0 ? -6 : 1 - dow);
}

/**
 * GET /api/team/week?department=&weekStart=YYYY-MM-DD
 * Vista semanal del equipo: por miembro y dia, fichajes/horas/incidencias, ausencias, vacaciones, turno asignado y excepcion de horario.
 * ADMIN cualquier departamento (obligatorio indicarlo); MANAGER solo el suyo (por defecto) -> 403 si pide otro.
 * weekStart: cualquier fecha; se normaliza al lunes de esa semana (por defecto la semana actual).
 */
exports.getTeamWeek = async (req, res) => {
    try {
        const role = req.user.role;
        let department = typeof req.query.department === 'string' && req.query.department ? req.query.department : null;
        if (role === 'MANAGER') {
            if (department && department !== req.user.department) {
                return res.status(403).json({ error: 'No autorizado para este departamento', code: 'DEPARTMENT_FORBIDDEN' });
            }
            department = req.user.department;
        } else if (role !== 'ADMIN') {
            return res.status(403).json({ error: 'No autorizado' });
        }
        if (!department) return res.status(400).json({ error: 'department es obligatorio' });

        let ref = req.query.weekStart;
        if (ref !== undefined && !isValidDateStr(ref)) return res.status(400).json({ error: 'weekStart debe tener formato YYYY-MM-DD' });
        if (!ref) {
            const n = new Date();
            ref = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        }
        const weekStart = mondayOf(ref);
        const weekEnd = addDays(weekStart, 6);
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

        // Rango de fechas con margen de un dia para absorber desfases horarios; luego se filtra por clave de dia
        const rangeStart = new Date(addDays(weekStart, -1) + 'T00:00:00Z');
        const rangeEnd = new Date(addDays(weekEnd, 2) + 'T00:00:00Z');
        const localStart = new Date(weekStart + 'T00:00:00');
        const localEnd = new Date(addDays(weekEnd, 1) + 'T00:00:00');

        const users = await prisma.user.findMany({
            where: { department, role: { not: 'ADMIN' } },
            select: { id: true, name: true, email: true, position: true, avatarUrl: true, active: true },
            orderBy: { name: 'asc' }
        });
        const userIds = users.map(u => u.id);

        const [shifts, fichajes, vacations, assignments, overrides] = await Promise.all([
            prisma.departmentShift.findMany({ where: { department } }),
            prisma.fichaje.findMany({
                where: { userId: { in: userIds }, timestamp: { gte: localStart, lt: localEnd } },
                orderBy: { timestamp: 'asc' }
            }),
            prisma.vacationRequest.findMany({
                where: {
                    userId: { in: userIds },
                    status: { not: 'REJECTED' },
                    startDate: { lte: rangeEnd },
                    endDate: { gte: rangeStart }
                },
                select: { id: true, userId: true, type: true, subtype: true, status: true, startDate: true, endDate: true, days: true, hours: true }
            }),
            prisma.userShiftAssignment.findMany({
                where: { userId: { in: userIds }, date: { gte: rangeStart, lt: rangeEnd } },
                include: { shift: { select: { id: true, name: true, horaEntrada: true, horaSalida: true, horaEntradaTarde: true, horaSalidaMañana: true } } }
            }),
            prisma.scheduleOverride.findMany({ where: { department, date: { gte: weekStart, lte: weekEnd } } })
        ]);

        const members = users.map(user => {
            const overrideMap = new Map();
            overrides.filter(o => o.userKey === '').forEach(o => overrideMap.set(o.date, o));
            overrides.filter(o => o.userKey === user.id).forEach(o => overrideMap.set(o.date, o));

            const byDay = new Map(groupFichajesByDay(fichajes.filter(f => f.userId === user.id), shifts, overrideMap).map(d => [d.date, d]));
            const userVacations = vacations.filter(v => v.userId === user.id);
            const userAssignments = assignments.filter(a => a.userId === user.id);

            let totalHours = 0;
            const daysOut = days.map(date => {
                const g = byDay.get(date);
                const abs = userVacations.filter(v => dayKey(v.startDate) <= date && dayKey(v.endDate) >= date);
                const ov = overrideMap.get(date);
                const shift = userAssignments.find(a => dayKey(a.date) === date);
                const hours = g ? g.horasTrabajadas : 0;
                totalHours += hours;
                return {
                    date,
                    fichajes: g ? g.fichajes.map(f => ({ id: f.id, tipo: f.tipo, timestamp: f.timestamp })) : [],
                    hours,
                    isComplete: g ? g.isComplete : false,
                    isLate: g ? g.isLate : false,
                    isEarlyDeparture: g ? g.isEarlyDeparture : false,
                    validationMessage: g ? g.validationMessage : '',
                    schedule: g ? g.daySchedule : null,
                    vacations: abs.filter(v => v.type === 'VACATION').map(v => ({ id: v.id, status: v.status, days: v.days })),
                    absences: abs.filter(v => v.type !== 'VACATION').map(v => ({ id: v.id, type: v.type, subtype: v.subtype, status: v.status, hours: v.hours, days: v.days })),
                    shift: shift ? shift.shift : null,
                    override: ov ? { id: ov.id, scope: ov.userKey ? 'USER' : 'DEPARTMENT', dayOff: ov.dayOff, horaEntrada: ov.horaEntrada, horaSalida: ov.horaSalida, toleranciaMinutos: ov.toleranciaMinutos, note: ov.note } : null
                };
            });
            return { user, totalHours: Math.round(totalHours * 100) / 100, days: daysOut };
        });

        res.json({ department, weekStart, weekEnd, days, shifts, members });
    } catch (error) {
        console.error('Error getting team week:', error);
        res.status(500).json({ error: 'Error al obtener la semana del equipo' });
    }
};
