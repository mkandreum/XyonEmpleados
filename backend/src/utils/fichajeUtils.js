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


        // Usar la tolerancia máxima configurada en el horario
        let isLate = false;
        let hasEarlyDeparture = false;
        let detectedTurno = null;
        let cumpleHorario = false;


        let validationMessage = '';
        if (daySchedule) {
            const entradas = sorted.filter(f => f.tipo === 'ENTRADA');
            const salidas = sorted.filter(f => f.tipo === 'SALIDA');
            const tolerancia = Number(daySchedule.toleranciaMinutos) || 0;
            const FLEX_PAUSA = 5; // margen extra solo para la pausa de comida

            // If flexible schedule, no late/early checks needed
            if (daySchedule.flexibleSchedule) {
                cumpleHorario = true;
                isLate = false;
                hasEarlyDeparture = false;
            } else if (hasSplitSchedule && entradas.length >= 2 && salidas.length >= 2) {
                // Split schedule: 2 entries + 2 exits (e.g., 9-15 + 16-18)
                const entradaManana = new Date(entradas[0].timestamp);
                const salidaManana = new Date(salidas[0].timestamp);
                const entradaTarde = new Date(entradas[1].timestamp);
                const salidaTarde = new Date(salidas[1].timestamp);

                const entradaMananaMinutes = entradaManana.getHours() * 60 + entradaManana.getMinutes();
                const salidaMananaMinutes = salidaManana.getHours() * 60 + salidaManana.getMinutes();
                const entradaTardeMinutes = entradaTarde.getHours() * 60 + entradaTarde.getMinutes();
                const salidaTardeMinutes = salidaTarde.getHours() * 60 + salidaTarde.getMinutes();

                const expectedEntradaManana = timeToMinutes(daySchedule.horaEntrada);
                const expectedSalidaManana = timeToMinutes(daySchedule.horaSalidaMañana);
                const expectedEntradaTarde = timeToMinutes(daySchedule.horaEntradaTarde);
                const expectedSalidaTarde = timeToMinutes(daySchedule.horaSalida);

                // Late arrival: entry is AFTER expected + tolerance
                const entradaMananaLate = entradaMananaMinutes > (expectedEntradaManana + tolerancia);
                const entradaTardeLate = entradaTardeMinutes > (expectedEntradaTarde + tolerancia);

                // Early departure: exit is BEFORE expected - tolerance
                const salidaMananaEarly = salidaMananaMinutes < (expectedSalidaManana - tolerancia);
                const salidaTardeEarly = salidaTardeMinutes < (expectedSalidaTarde - tolerancia);

                // Lunch break check (between morning exit and afternoon entry)
                const pausaMin = 30;
                const pausaMax = 120;
                const pausaComida = (entradaTarde - salidaManana) / (1000 * 60);
                const pausaOK = pausaComida >= (pausaMin - FLEX_PAUSA) && pausaComida <= (pausaMax + FLEX_PAUSA);

                // Set flags independently
                isLate = entradaMananaLate || entradaTardeLate;
                hasEarlyDeparture = salidaMananaEarly || salidaTardeEarly;
                cumpleHorario = !isLate && !hasEarlyDeparture && pausaOK;

                if (entradaMananaLate) validationMessage = 'Entrada de mañana tarde';
                else if (salidaMananaEarly) validationMessage = 'Salida de mañana anticipada';
                else if (!pausaOK) validationMessage = 'Pausa de comida fuera de rango (30min-2h)';
                else if (entradaTardeLate) validationMessage = 'Entrada de tarde tarde';
                else if (salidaTardeEarly) validationMessage = 'Salida de tarde anticipada';
            } else if (!hasSplitSchedule && entradas.length >= 1 && salidas.length >= 1) {
                // Continuous schedule: 1 entry + 1 exit
                const entrada = new Date(entradas[0].timestamp);
                const salida = new Date(salidas[salidas.length - 1].timestamp);
                const entradaMinutes = entrada.getHours() * 60 + entrada.getMinutes();
                const salidaMinutes = salida.getHours() * 60 + salida.getMinutes();

                const expectedEntrada = timeToMinutes(daySchedule.horaEntrada);
                const expectedSalida = timeToMinutes(daySchedule.horaSalida);

                // Late: arrived AFTER expected + tolerance
                isLate = entradaMinutes > (expectedEntrada + tolerancia);
                // Early: left BEFORE expected - tolerance
                hasEarlyDeparture = salidaMinutes < (expectedSalida - tolerancia);
                cumpleHorario = !isLate && !hasEarlyDeparture;

                if (isLate) validationMessage = 'Llegada tarde';
                else if (hasEarlyDeparture) validationMessage = 'Salida anticipada';
            } else if (entradas.length > 0 && salidas.length === 0) {
                // Has entries but no exits yet (workday in progress)
                isLate = false;
                hasEarlyDeparture = false;
                cumpleHorario = false;
                validationMessage = 'Jornada en curso';
            } else {
                isLate = true;
                hasEarlyDeparture = true;
                cumpleHorario = false;
                validationMessage = 'Faltan fichajes para completar el día';
            }

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
            cumpleHorario,
            turno: detectedTurno,
            validationMessage,
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
