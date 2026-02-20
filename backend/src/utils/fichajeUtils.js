const { getScheduleForDay, detectTurno, timeToMinutes } = require('../services/smartScheduleService');

/**
 * Calcula las horas trabajadas en un día basándose en los fichajes
 * Soporta horarios partidos (4 fichajes) y jornada continua (2 fichajes)
 */
function calculateWorkedHours(fichajes) {
    if (fichajes.length === 0) return 0;

    // Ordenar por timestamp
    const sorted = [...fichajes].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalMinutes = 0;

    // Procesar pares de ENTRADA-SALIDA
    for (let i = 0; i < sorted.length - 1; i += 2) {
        const entrada = sorted[i];
        const salida = sorted[i + 1];

        if (entrada.tipo === 'ENTRADA' && salida?.tipo === 'SALIDA') {
            const entradaTime = new Date(entrada.timestamp).getTime();
            const salidaTime = new Date(salida.timestamp).getTime();
            const diffMinutes = (salidaTime - entradaTime) / (1000 * 60);
            totalMinutes += diffMinutes;
        }
    }

    // Convertir a horas con 2 decimales
    return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Determina si un fichaje de entrada es una llegada tarde.
 * Ahora usa getScheduleForDay para obtener el horario del día específico
 * y detectTurno para calcular inteligentemente el turno.
 * 
 * @param {Object} fichaje - El fichaje a evaluar
 * @param {Object} schedule - El DepartmentSchedule completo (con campos por día)
 * @param {Object} [dayScheduleOverride] - Horario del día ya resuelto (optimización)
 */
function isLateArrival(fichaje, schedule, dayScheduleOverride) {
    if (fichaje.tipo !== 'ENTRADA') return false;

    const fichajeDate = new Date(fichaje.timestamp);

    // Resolve the day's schedule
    const daySchedule = dayScheduleOverride || getScheduleForDay(schedule, fichajeDate);
    if (!daySchedule) return false; // Day off, no late arrivals

    // Si el horario es flexible, no hay llegadas tarde
    if (daySchedule.flexibleSchedule) return false;

    const fichajeHour = fichajeDate.getHours();
    const fichajeMinute = fichajeDate.getMinutes();
    const fichajeTotalMinutes = fichajeHour * 60 + fichajeMinute;

    // Use smart turno detection instead of hardcoded "if >= 12"
    const turnoInfo = detectTurno(fichajeDate, daySchedule);
    if (!turnoInfo || turnoInfo.turno === 'FLEXIBLE') return false;

    const expectedEntryMinutes = timeToMinutes(turnoInfo.expectedEntry);
    if (expectedEntryMinutes === null) return false;

    const maxAllowedMinutes = expectedEntryMinutes + daySchedule.toleranciaMinutos;

    return fichajeTotalMinutes > maxAllowedMinutes;
}

/**
 * Determina si un fichaje de salida es una salida temprana.
 * Ahora usa getScheduleForDay + detectTurno para lógica inteligente.
 */
function isEarlyDeparture(fichaje, schedule, dayScheduleOverride) {
    if (fichaje.tipo !== 'SALIDA') return false;

    const fichajeDate = new Date(fichaje.timestamp);

    // Resolve the day's schedule
    const daySchedule = dayScheduleOverride || getScheduleForDay(schedule, fichajeDate);
    if (!daySchedule) return false;

    // Si el horario es flexible, no hay salidas tempranas
    if (daySchedule.flexibleSchedule) return false;

    const fichajeHour = fichajeDate.getHours();
    const fichajeMinute = fichajeDate.getMinutes();
    const fichajeTotalMinutes = fichajeHour * 60 + fichajeMinute;

    // Use smart turno detection
    const turnoInfo = detectTurno(fichajeDate, daySchedule);
    if (!turnoInfo || turnoInfo.turno === 'FLEXIBLE') return false;

    const expectedExitMinutes = timeToMinutes(turnoInfo.expectedExit);
    if (expectedExitMinutes === null) return false;

    const minAllowedMinutes = expectedExitMinutes - daySchedule.toleranciaMinutos;

    return fichajeTotalMinutes < minAllowedMinutes;
}

/**
 * Agrupa fichajes por día.
 * Now resolves per-day schedules so each day is evaluated against its own schedule.
 */
function groupFichajesByDay(fichajes, schedule) {
    const groups = new Map();

    fichajes.forEach(fichaje => {
        const date = new Date(fichaje.timestamp).toISOString().split('T')[0];
        if (!groups.has(date)) {
            groups.set(date, []);
        }
        groups.get(date).push(fichaje);
    });

    return Array.from(groups.entries()).map(([date, dayFichajes]) => {
        const sorted = dayFichajes.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const horasTrabajadas = calculateWorkedHours(sorted);

        // Resolve the schedule for this specific day
        const dateObj = new Date(date + 'T12:00:00'); // Use noon to avoid timezone issues
        const daySchedule = getScheduleForDay(schedule, dateObj);

        // Determinar si el día está completo
        // Horario partido: 4 fichajes, Jornada continua: 2 fichajes
        const hasSplitSchedule = daySchedule?.horaEntradaTarde && daySchedule?.horaSalidaMañana;
        const expectedFichajes = hasSplitSchedule ? 4 : 2;
        const isComplete = sorted.length >= expectedFichajes && sorted.length % 2 === 0;

        // Verificar llegadas tarde y salidas tempranas using per-day schedule
        let isLate = false;
        let hasEarlyDeparture = false;
        let detectedTurno = null;

        if (daySchedule) {
            const entradas = sorted.filter(f => f.tipo === 'ENTRADA');
            const salidas = sorted.filter(f => f.tipo === 'SALIDA');

            isLate = entradas.some(f => isLateArrival(f, schedule, daySchedule));

            // Solo marcar salida anticipada si la duración del trabajo es razonable (> 10 mins)
            hasEarlyDeparture = salidas.some((f, index) => {
                if (!isEarlyDeparture(f, schedule, daySchedule)) return false;

                // Buscar la entrada correspondiente
                const entradaCodespot = entradas[index];
                if (entradaCodespot) {
                    const diff = (new Date(f.timestamp) - new Date(entradaCodespot.timestamp)) / (1000 * 60);
                    if (diff < 10) return false; // Ignorar si trabajó menos de 10 minutos
                }
                return true;
            });

            // Detect turno from first entry
            if (entradas.length > 0) {
                detectedTurno = detectTurno(new Date(entradas[0].timestamp), daySchedule);
            }
        }

        return {
            date,
            fichajes: sorted,
            horasTrabajadas,
            isComplete,
            isLate,
            isEarlyDeparture: hasEarlyDeparture,
            turno: detectedTurno,
            daySchedule: daySchedule ? {
                horaEntrada: daySchedule.horaEntrada,
                horaSalida: daySchedule.horaSalida,
                horaEntradaTarde: daySchedule.horaEntradaTarde,
                horaSalidaMañana: daySchedule.horaSalidaMañana,
                isOverride: daySchedule.isOverride,
                flexibleSchedule: daySchedule.flexibleSchedule
            } : null
        };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Más reciente primero
}

/**
 * Valida que la secuencia de fichajes sea correcta
 */
function validateFichajeSequence(fichajes) {
    if (fichajes.length === 0) return { valid: true };

    const sorted = [...fichajes].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].tipo === sorted[i + 1].tipo) {
            return {
                valid: false,
                error: `No puedes tener dos ${sorted[i].tipo === 'ENTRADA' ? 'entradas' : 'salidas'} seguidas`
            };
        }
    }

    return { valid: true };
}

/**
 * Obtiene el último fichaje de un usuario para un día específico
 */
function getLastFichajeOfDay(fichajes) {
    if (fichajes.length === 0) return null;

    return fichajes.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    });
}

/**
 * Determina el tipo de fichaje que debe realizar el usuario a continuación
 */
function getNextFichajeTipo(lastFichaje) {
    if (!lastFichaje) return 'ENTRADA';
    return lastFichaje.tipo === 'ENTRADA' ? 'SALIDA' : 'ENTRADA';
}

/**
 * Obtiene la medianoche local para una fecha dada
 */
function getLocalMidnight(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Obtiene el rango del día actual
 */
function getTodayRange(referenceDate = new Date()) {
    const today = getLocalMidnight(referenceDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { today, tomorrow };
}

module.exports = {
    calculateWorkedHours,
    isLateArrival,
    isEarlyDeparture,
    groupFichajesByDay,
    validateFichajeSequence,
    getLastFichajeOfDay,
    getNextFichajeTipo,
    getLocalMidnight,
    getTodayRange
};
