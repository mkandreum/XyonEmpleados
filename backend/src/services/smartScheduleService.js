/**
 * Smart Schedule Service
 * 
 * Resolves per-day schedules and detects the correct shift/turno
 * based on the actual clock-in time.
 */

// Map JS day index (0=Sun, 1=Mon...) to schedule field names
const DAY_FIELD_MAP = {
    0: 'scheduleDomingo',
    1: 'scheduleLunes',
    2: 'scheduleMartes',
    3: 'scheduleMiercoles',
    4: 'scheduleJueves',
    5: 'scheduleViernes',
    6: 'scheduleSabado'
};

const DAY_NAMES_ES = {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado'
};

/**
 * Resolves the effective schedule for a specific day.
 * If the department has a per-day override, use it; otherwise fall back to the default.
 * 
 * @param {Object} schedule - The DepartmentSchedule object (with per-day JSON fields)
 * @param {Date} date - The date to resolve the schedule for
 * @returns {Object|null} - The resolved schedule for that day, or null if no schedule
 */
function getScheduleForDay(schedule, date) {
    if (!schedule) return null;

    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
    const fieldName = DAY_FIELD_MAP[dayOfWeek];
    const dayOverride = schedule[fieldName];

    // If there's a per-day override, merge with base schedule
    if (dayOverride && typeof dayOverride === 'object') {
        // A day override with horaEntrada = null or empty means "day off"
        if (dayOverride.dayOff === true) {
            return null;
        }
        return {
            horaEntrada: dayOverride.horaEntrada || schedule.horaEntrada,
            horaSalida: dayOverride.horaSalida || schedule.horaSalida,
            horaEntradaTarde: dayOverride.horaEntradaTarde !== undefined ? dayOverride.horaEntradaTarde : (schedule.horaEntradaTarde || null),
            horaSalidaMañana: dayOverride.horaSalidaMañana !== undefined ? dayOverride.horaSalidaMañana : (schedule.horaSalidaMañana || null),
            toleranciaMinutos: dayOverride.toleranciaMinutos !== undefined ? dayOverride.toleranciaMinutos : schedule.toleranciaMinutos,
            flexibleSchedule: dayOverride.flexibleSchedule !== undefined ? dayOverride.flexibleSchedule : schedule.flexibleSchedule,
            isOverride: true,
            dayName: DAY_NAMES_ES[dayOfWeek]
        };
    }

    // No override: return default schedule
    return {
        horaEntrada: schedule.horaEntrada,
        horaSalida: schedule.horaSalida,
        horaEntradaTarde: schedule.horaEntradaTarde || null,
        horaSalidaMañana: schedule.horaSalidaMañana || null,
        toleranciaMinutos: schedule.toleranciaMinutos,
        flexibleSchedule: schedule.flexibleSchedule,
        isOverride: false,
        dayName: DAY_NAMES_ES[dayOfWeek]
    };
}

/**
 * Parses a time string "HH:mm" into total minutes from midnight
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Detects which shift (turno) a clock-in time corresponds to.
 * Instead of the old hardcoded "if hour >= 12 → tarde", this calculates
 * the midpoint between morning and afternoon entry times.
 * 
 * @param {Date} fichajeTime - The timestamp of the clock-in
 * @param {Object} daySchedule - The resolved schedule for specific day
 * @returns {{ turno: 'MAÑANA'|'TARDE'|'COMPLETA', expectedEntry: string, expectedExit: string, label: string }}
 */
function detectTurno(fichajeTime, daySchedule) {
    if (!daySchedule) return null;
    if (daySchedule.flexibleSchedule) {
        return {
            turno: 'FLEXIBLE',
            expectedEntry: daySchedule.horaEntrada,
            expectedExit: daySchedule.horaSalida,
            label: 'Horario Flexible'
        };
    }

    const fichajeMinutes = fichajeTime.getHours() * 60 + fichajeTime.getMinutes();

    // If there's a split schedule (jornada partida)
    if (daySchedule.horaEntradaTarde && daySchedule.horaSalidaMañana) {
        const entradaMañana = timeToMinutes(daySchedule.horaEntrada);
        const salidaMañana = timeToMinutes(daySchedule.horaSalidaMañana);
        const entradaTarde = timeToMinutes(daySchedule.horaEntradaTarde);
        const salidaTarde = timeToMinutes(daySchedule.horaSalida);

        // Calculate midpoint between morning exit and afternoon entry
        // This is the intelligent break: anything before midpoint = morning, after = afternoon
        const midpoint = Math.round((salidaMañana + entradaTarde) / 2);

        if (fichajeMinutes < midpoint) {
            return {
                turno: 'MAÑANA',
                expectedEntry: daySchedule.horaEntrada,
                expectedExit: daySchedule.horaSalidaMañana,
                label: `Turno Mañana (${daySchedule.horaEntrada} - ${daySchedule.horaSalidaMañana})`
            };
        } else {
            return {
                turno: 'TARDE',
                expectedEntry: daySchedule.horaEntradaTarde,
                expectedExit: daySchedule.horaSalida,
                label: `Turno Tarde (${daySchedule.horaEntradaTarde} - ${daySchedule.horaSalida})`
            };
        }
    }

    // Continuous schedule (jornada continua)
    return {
        turno: 'COMPLETA',
        expectedEntry: daySchedule.horaEntrada,
        expectedExit: daySchedule.horaSalida,
        label: `Jornada Completa (${daySchedule.horaEntrada} - ${daySchedule.horaSalida})`
    };
}

/**
 * Gets all 7 day schedules for a department, useful for the admin UI
 */
function getAllDaySchedules(schedule) {
    if (!schedule) return {};

    const result = {};
    for (let day = 0; day <= 6; day++) {
        const date = new Date(2024, 0, day === 0 ? 7 : day); // Mon=1, Tue=2... Sun=7
        const daySchedule = getScheduleForDay(schedule, date);
        result[DAY_NAMES_ES[day]] = daySchedule;
    }
    return result;
}

module.exports = {
    getScheduleForDay,
    detectTurno,
    timeToMinutes,
    getAllDaySchedules,
    DAY_FIELD_MAP,
    DAY_NAMES_ES
};
