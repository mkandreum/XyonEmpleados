// Servicio para seleccionar el horario más cercano según el fichaje y la tolerancia

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Dado un array de DepartmentShift y un fichaje, selecciona el horario más cercano
 * @param {Array} shifts - Todos los DepartmentShift del departamento
 * @param {Date} fichajeDate - Fecha/hora del fichaje
 * @returns {Object|null} - El horario más cercano o null si ninguno aplica
 */
function selectClosestShift(shifts, fichajeDate) {
    if (!Array.isArray(shifts) || shifts.length === 0) return null;
    const dayOfWeek = fichajeDate.getDay(); // 0=Domingo
    const dayNames = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
    const dayName = dayNames[dayOfWeek];
    const fichajeMinutes = fichajeDate.getHours() * 60 + fichajeDate.getMinutes();

    // Filtrar solo los horarios activos ese día
    const activeShifts = shifts.filter(shift =>
        shift.activeDays && shift.activeDays.split(',').includes(dayName)
    );
    if (activeShifts.length === 0) return null;

    // Buscar el horario cuya horaEntrada esté más cerca del fichaje y dentro de la tolerancia
    let bestShift = null;
    let minDiff = Infinity;
    for (const shift of activeShifts) {
        const entradaMin = timeToMinutes(shift.horaEntrada);
        const diff = Math.abs(fichajeMinutes - entradaMin);
        if (diff <= (shift.toleranciaMinutos || 10) && diff < minDiff) {
            bestShift = shift;
            minDiff = diff;
        }
    }
    // Si ninguno está dentro de la tolerancia, asignar el más cercano igualmente
    if (!bestShift) {
        for (const shift of activeShifts) {
            const entradaMin = timeToMinutes(shift.horaEntrada);
            const diff = Math.abs(fichajeMinutes - entradaMin);
            if (diff < minDiff) {
                bestShift = shift;
                minDiff = diff;
            }
        }
    }
    return bestShift;
}

module.exports = { selectClosestShift, timeToMinutes };
