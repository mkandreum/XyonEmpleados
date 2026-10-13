/**
 * Excepciones de horario por dia (ScheduleOverride).
 * Alcance: usuario (userKey = userId) o departamento (userKey = ''). La del usuario prevalece.
 */
const prisma = require('../lib/prisma');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

function isValidDateStr(s) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Mapa fecha(YYYY-MM-DD) -> override efectivo para un usuario/departamento en un rango (inclusive).
 */
async function loadOverrideMap(department, userId, fromStr, toStr) {
    const map = new Map();
    if (!department) return map;
    const rows = await prisma.scheduleOverride.findMany({
        where: {
            department,
            date: { gte: fromStr, lte: toStr },
            OR: [{ userKey: '' }, ...(userId ? [{ userKey: String(userId) }] : [])]
        }
    });
    // primero los de departamento, luego los de usuario (sobrescriben)
    rows.filter(r => r.userKey === '').forEach(r => map.set(r.date, r));
    rows.filter(r => r.userKey !== '').forEach(r => map.set(r.date, r));
    return map;
}

/**
 * Aplica un override a un horario del dia (formato daySchedule). Devuelve null si es dia libre.
 * Si no habia horario base y el override define horas, construye uno.
 */
function applyOverrideToDaySchedule(daySchedule, override, dayName) {
    if (!override) return daySchedule;
    if (override.dayOff) return null;
    const base = daySchedule || {};
    const entrada = override.horaEntrada || base.horaEntrada;
    const salida = override.horaSalida || base.horaSalida;
    if (!entrada || !salida) return daySchedule;
    const hasCustomHours = !!(override.horaEntrada || override.horaSalida);
    return {
        horaEntrada: entrada,
        horaSalida: salida,
        // un horario puntual con horas propias sustituye al turno partido
        horaEntradaTarde: hasCustomHours ? null : (base.horaEntradaTarde || null),
        horaSalidaMañana: hasCustomHours ? null : (base.horaSalidaMañana || null),
        toleranciaMinutos: override.toleranciaMinutos != null ? override.toleranciaMinutos : (base.toleranciaMinutos != null ? base.toleranciaMinutos : 10),
        flexibleSchedule: hasCustomHours ? false : !!base.flexibleSchedule,
        isOverride: true,
        dayName: dayName || base.dayName
    };
}

/** Override aplicable a un turno (DepartmentShift) concreto en una fecha; devuelve copia del turno o null si dia libre. */
function applyOverrideToShift(shift, override) {
    if (!override) return shift;
    if (override.dayOff) return null;
    return {
        ...shift,
        horaEntrada: override.horaEntrada || shift.horaEntrada,
        horaSalida: override.horaSalida || shift.horaSalida,
        toleranciaMinutos: override.toleranciaMinutos != null ? override.toleranciaMinutos : shift.toleranciaMinutos,
        ...((override.horaEntrada || override.horaSalida) ? { horaEntradaTarde: null, horaSalidaMañana: null, flexibleSchedule: false, activeDays: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES,SABADO,DOMINGO' } : {})
    };
}

function serialize(o) {
    return {
        id: o.id,
        department: o.department,
        userId: o.userId || null,
        scope: o.userId ? 'USER' : 'DEPARTMENT',
        date: o.date,
        dayOff: o.dayOff,
        horaEntrada: o.horaEntrada,
        horaSalida: o.horaSalida,
        toleranciaMinutos: o.toleranciaMinutos,
        note: o.note
    };
}

module.exports = { isValidDateStr, TIME_RE, loadOverrideMap, applyOverrideToDaySchedule, applyOverrideToShift, serialize };
