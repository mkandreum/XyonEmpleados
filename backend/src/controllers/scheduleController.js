const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');

/**
 * GET /api/department-schedules/:department
 * Obtener todos los turnos (shifts) de un departamento
 */
exports.getSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const shifts = await prisma.departmentShift.findMany({
            where: { department },
            orderBy: { name: 'asc' }
        });

        if (!shifts || shifts.length === 0) {
            // Retornar turno por defecto si no existe
            return res.json([{
                id: 'default',
                department,
                name: 'General',
                activeDays: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES',
                horaEntrada: '09:00',
                horaSalida: '18:00',
                toleranciaMinutos: 10,
                horaEntradaTarde: null,
                horaSalidaMañana: null,
                flexibleSchedule: false,
                scheduleOverrides: null
            }]);
        }

        res.json(shifts);
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

/**
 * POST /api/department-schedules
 * Crear o actualizar un turno de departamento (solo admins)
 */
exports.upsertSchedule = async (req, res) => {
    try {
        const {
            department,
            name,
            activeDays,
            horaEntrada,
            horaSalida,
            horaEntradaTarde,
            horaSalidaMañana,
            toleranciaMinutos,
            flexibleSchedule,
            scheduleOverrides
        } = req.body;

        const shiftName = name || "General";

        if (!department || !horaEntrada || !horaSalida) {
            return res.status(400).json({
                error: 'Departamento, hora de entrada y hora de salida son obligatorios'
            });
        }

        // Validar formato de horas (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horaEntrada) || !timeRegex.test(horaSalida)) {
            return res.status(400).json({
                error: 'Formato de hora inválido. Use HH:mm'
            });
        }

        if (horaEntradaTarde && !timeRegex.test(horaEntradaTarde)) {
            return res.status(400).json({
                error: 'Formato de hora de entrada tarde inválido. Use HH:mm'
            });
        }

        if (horaSalidaMañana && !timeRegex.test(horaSalidaMañana)) {
            return res.status(400).json({
                error: 'Formato de hora de salida mañana inválido. Use HH:mm'
            });
        }

        // Validar que activeDays sea comma-separated
        const validDays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
        const daysToCheck = (activeDays || 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES')
            .split(',')
            .map(d => d.trim())
            .filter(d => d);
        
        for (const day of daysToCheck) {
            if (!validDays.includes(day.toUpperCase())) {
                return res.status(400).json({
                    error: `Día inválido: ${day}. Valores válidos: ${validDays.join(', ')}`
                });
            }
        }

        const data = {
            horaEntrada,
            horaSalida,
            activeDays: (activeDays || 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES').toUpperCase(),
            horaEntradaTarde: horaEntradaTarde || null,
            horaSalidaMañana: horaSalidaMañana || null,
            toleranciaMinutos: toleranciaMinutos || 10,
            flexibleSchedule: flexibleSchedule || false,
            scheduleOverrides: scheduleOverrides || null
        };

        const shift = await prisma.departmentShift.upsert({
            where: { department_name: { department, name: shiftName } },
            update: data,
            create: {
                department,
                name: shiftName,
                ...data
            }
        });

        res.json(shift);
    } catch (error) {
        console.error('Error upserting schedule:', error);
        res.status(500).json({ error: 'Error al guardar horario' });
    }
};

/**
 * GET /api/department-schedules
 * Obtener todos los turnos de todos los departamentos (solo admins)
 */
exports.getAllSchedules = async (req, res) => {
    try {
        const shifts = await prisma.departmentShift.findMany({
            orderBy: [{ department: 'asc' }, { name: 'asc' }]
        });

        res.json(shifts);
    } catch (error) {
        console.error('Error getting all schedules:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

/**
 * DELETE /api/department-schedules/:id
 * Eliminar un turno específico (solo admins)
 */
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const shift = await prisma.departmentShift.findUnique({
            where: { id }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        await prisma.departmentShift.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Turno eliminado' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
};

/**
 * GET /api/department-schedules/:department/resolved
 * Obtener información completa del turno con overrides resueltos
 */
exports.getResolvedSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const shifts = await prisma.departmentShift.findMany({
            where: { department }
        });

        if (!shifts || shifts.length === 0) {
            return res.json({
                department,
                shifts: []
            });
        }

        res.json({
            department,
            shifts
        });
    } catch (error) {
        console.error('Error getting resolved schedule:', error);
        res.status(500).json({ error: 'Error al obtener horarios resueltos' });
    }
};

// ─── Excepciones de horario por dia ──────────────────────────────────────────

const overrideSvc = require('../services/scheduleOverrideService');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditService');

/** Comprueba permisos sobre un ambito {department, userId?}. Devuelve {department, userId|null} o responde con error. */
async function resolveOverrideScope(req, res, { department, userId }, { write }) {
    const role = req.user.role;
    let dept = typeof department === 'string' && department ? department : null;
    let uid = typeof userId === 'string' && userId ? userId : null;

    if (uid) {
        const target = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, department: true } });
        if (!target) { res.status(404).json({ error: 'Usuario no encontrado' }); return null; }
        if (dept && dept !== target.department) { res.status(400).json({ error: 'El usuario no pertenece a ese departamento' }); return null; }
        dept = target.department;
        // Empleados: solo lectura de lo propio
        if (role === 'EMPLOYEE' && (write || uid !== req.user.userId)) { res.status(403).json({ error: 'No autorizado' }); return null; }
    } else {
        if (!dept) dept = req.user.department;
        if (role === 'EMPLOYEE' && (write || dept !== req.user.department)) { res.status(403).json({ error: 'No autorizado' }); return null; }
    }
    if (role === 'MANAGER' && dept !== req.user.department) {
        res.status(403).json({ error: 'No autorizado para este departamento', code: 'DEPARTMENT_FORBIDDEN' });
        return null;
    }
    return { department: dept, userId: uid };
}

/**
 * GET /api/schedule-overrides?department=&userId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Sin userId: devuelve las del departamento. Con userId: las del usuario (y las del departamento, campo scope).
 * ADMIN cualquiera; MANAGER su departamento; EMPLEADO solo las suyas/de su departamento.
 */
exports.getOverrides = async (req, res) => {
    try {
        const { from, to } = req.query;
        if ((from && !overrideSvc.isValidDateStr(from)) || (to && !overrideSvc.isValidDateStr(to))) {
            return res.status(400).json({ error: 'from/to deben tener formato YYYY-MM-DD' });
        }
        const scope = await resolveOverrideScope(req, res, req.query, { write: false });
        if (!scope) return;
        const where = {
            department: scope.department,
            ...(from || to ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
            OR: scope.userId ? [{ userKey: '' }, { userKey: scope.userId }] : [{ userKey: '' }]
        };
        const rows = await prisma.scheduleOverride.findMany({ where, orderBy: [{ date: 'asc' }, { userKey: 'asc' }], take: 1000 });
        res.json(rows.map(overrideSvc.serialize));
    } catch (error) {
        console.error('Error getting schedule overrides:', error);
        res.status(500).json({ error: 'Error al obtener excepciones de horario' });
    }
};

/**
 * PUT /api/schedule-overrides  { date, userId? | department?, dayOff?, horaEntrada?, horaSalida?, toleranciaMinutos?, note? }
 * Crea o reemplaza la excepcion de ese dia (upsert). ADMIN cualquiera; MANAGER solo su departamento.
 */
exports.setOverride = async (req, res) => {
    try {
        const b = req.body || {};
        if (!overrideSvc.isValidDateStr(b.date)) return res.status(400).json({ error: 'date debe tener formato YYYY-MM-DD' });
        const dayOff = b.dayOff === true;
        const norm = (v) => (v === undefined || v === null || v === '' ? null : v);
        const horaEntrada = norm(b.horaEntrada), horaSalida = norm(b.horaSalida);
        if (!dayOff) {
            if (!horaEntrada && !horaSalida && b.toleranciaMinutos == null) {
                return res.status(400).json({ error: 'Indica dayOff:true o al menos horaEntrada/horaSalida/toleranciaMinutos' });
            }
            for (const t of [horaEntrada, horaSalida]) {
                if (t && !overrideSvc.TIME_RE.test(t)) return res.status(400).json({ error: 'Formato de hora invalido. Use HH:mm' });
            }
        }
        let tolerancia = null;
        if (b.toleranciaMinutos != null) {
            tolerancia = Number(b.toleranciaMinutos);
            if (!Number.isInteger(tolerancia) || tolerancia < 0 || tolerancia > 240) {
                return res.status(400).json({ error: 'toleranciaMinutos debe ser un entero entre 0 y 240' });
            }
        }
        const note = typeof b.note === 'string' ? b.note.trim().slice(0, 300) || null : null;

        const scope = await resolveOverrideScope(req, res, b, { write: true });
        if (!scope) return;
        const userKey = scope.userId || '';
        const data = {
            dayOff,
            horaEntrada: dayOff ? null : horaEntrada,
            horaSalida: dayOff ? null : horaSalida,
            toleranciaMinutos: dayOff ? null : tolerancia,
            note,
            createdById: req.user.userId
        };
        const row = await prisma.scheduleOverride.upsert({
            where: { department_userKey_date: { department: scope.department, userKey, date: b.date } },
            update: data,
            create: { ...data, department: scope.department, userId: scope.userId, userKey, date: b.date }
        });
        await logAudit(req.user.userId, AUDIT_ACTIONS.SCHEDULE_OVERRIDE_SET, 'SCHEDULE_OVERRIDE', row.id,
            { department: scope.department, userId: scope.userId, date: b.date, dayOff, horaEntrada, horaSalida }, req);
        res.json(overrideSvc.serialize(row));
    } catch (error) {
        console.error('Error setting schedule override:', error);
        res.status(500).json({ error: 'Error al guardar la excepcion de horario' });
    }
};

/**
 * DELETE /api/schedule-overrides/:id
 */
exports.deleteOverride = async (req, res) => {
    try {
        const row = await prisma.scheduleOverride.findUnique({ where: { id: req.params.id } });
        if (!row) return res.status(404).json({ error: 'Excepcion no encontrada' });
        if (req.user.role !== 'ADMIN' && row.department !== req.user.department) {
            return res.status(403).json({ error: 'No autorizado para este departamento', code: 'DEPARTMENT_FORBIDDEN' });
        }
        await prisma.scheduleOverride.delete({ where: { id: row.id } });
        await logAudit(req.user.userId, AUDIT_ACTIONS.SCHEDULE_OVERRIDE_DELETED, 'SCHEDULE_OVERRIDE', row.id,
            { department: row.department, userId: row.userId, date: row.date }, req);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting schedule override:', error);
        res.status(500).json({ error: 'Error al eliminar la excepcion de horario' });
    }
};
