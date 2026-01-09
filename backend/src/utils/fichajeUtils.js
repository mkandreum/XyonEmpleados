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
 * Determina si un fichaje de entrada es una llegada tarde
 */
function isLateArrival(fichaje, schedule) {
    if (fichaje.tipo !== 'ENTRADA') return false;

    const fichajeTime = new Date(fichaje.timestamp);
    const fichajeHour = fichajeTime.getHours();
    const fichajeMinute = fichajeTime.getMinutes();
    const fichajeTotalMinutes = fichajeHour * 60 + fichajeMinute;

    // Determinar si es entrada de mañana o tarde
    const [entradaHour, entradaMinute] = schedule.horaEntrada.split(':').map(Number);
    const entradaTotalMinutes = entradaHour * 60 + entradaMinute;

    let expectedEntrada = entradaTotalMinutes;

    // Si hay horario partido y el fichaje es después de mediodía, comparar con entrada tarde
    if (schedule.horaEntradaTarde && fichajeHour >= 12) {
        const [entradaTardeHour, entradaTardeMinute] = schedule.horaEntradaTarde.split(':').map(Number);
        expectedEntrada = entradaTardeHour * 60 + entradaTardeMinute;
    }

    const maxAllowedMinutes = expectedEntrada + schedule.toleranciaMinutos;

    return fichajeTotalMinutes > maxAllowedMinutes;
}

/**
 * Determina si un fichaje de salida es una salida temprana
 */
function isEarlyDeparture(fichaje, schedule) {
    if (fichaje.tipo !== 'SALIDA') return false;

    const fichajeTime = new Date(fichaje.timestamp);
    const fichajeHour = fichajeTime.getHours();
    const fichajeMinute = fichajeTime.getMinutes();
    const fichajeTotalMinutes = fichajeHour * 60 + fichajeMinute;

    // Determinar si es salida de mañana o tarde
    const [salidaHour, salidaMinute] = schedule.horaSalida.split(':').map(Number);
    const salidaTotalMinutes = salidaHour * 60 + salidaMinute;

    let expectedSalida = salidaTotalMinutes;

    // Si hay horario partido y el fichaje es antes de las 15:00, comparar con salida mañana
    if (schedule.horaSalidaMañana && fichajeHour < 15) {
        const [salidaMañanaHour, salidaMañanaMinute] = schedule.horaSalidaMañana.split(':').map(Number);
        expectedSalida = salidaMañanaHour * 60 + salidaMañanaMinute;
    }

    const minAllowedMinutes = expectedSalida - schedule.toleranciaMinutos;

    return fichajeTotalMinutes < minAllowedMinutes;
}

/**
 * Agrupa fichajes por día
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

        // Determinar si el día está completo
        // Horario partido: 4 fichajes, Jornada continua: 2 fichajes
        const expectedFichajes = schedule?.horaEntradaTarde ? 4 : 2;
        const isComplete = sorted.length >= expectedFichajes && sorted.length % 2 === 0;

        // Verificar llegadas tarde y salidas tempranas
        let isLate = false;
        let hasEarlyDeparture = false;

        if (schedule) {
            const entradas = sorted.filter(f => f.tipo === 'ENTRADA');
            const salidas = sorted.filter(f => f.tipo === 'SALIDA');

            isLate = entradas.some(f => isLateArrival(f, schedule));
            hasEarlyDeparture = salidas.some(f => isEarlyDeparture(f, schedule));
        }

        return {
            date,
            fichajes: sorted,
            horasTrabajadas,
            isComplete,
            isLate,
            isEarlyDeparture: hasEarlyDeparture
        };
    }).sort((a, b) => b.date.localeCompare(a.date)); // Más reciente primero
}

/**
 * Valida que la secuencia de fichajes sea correcta
 * No debe haber dos entradas seguidas o dos salidas seguidas
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

module.exports = {
    calculateWorkedHours,
    isLateArrival,
    isEarlyDeparture,
    groupFichajesByDay,
    validateFichajeSequence,
    getLastFichajeOfDay,
    getNextFichajeTipo
};
