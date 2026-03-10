// Servicio para seleccionar el horario más cercano según el fichaje y la tolerancia
const { detectTurno, getScheduleForDay } = require('./smartScheduleService');

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Dado un array de DepartmentShift y un fichaje, selecciona el horario más cercano
 * MEJORA: Añade límite de diferencia máxima y detecta turnos partidos correctamente
 * @param {Array} shifts - Todos los DepartmentShift del departamento
 * @param {Date} fichajeDate - Fecha/hora del fichaje
 * @returns {Object|null} - El horario más cercano o null si ninguno aplica
 */
function selectClosestShift(shifts, fichajeDate) {
    if (!Array.isArray(shifts) || shifts.length === 0) {
        console.log('[selectClosestShift] No shifts available');
        return null;
    }
    
    const dayOfWeek = fichajeDate.getDay(); // 0=Domingo
    const dayNames = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
    const dayName = dayNames[dayOfWeek];
    const fichajeHour = fichajeDate.getHours();
    const fichajeMinute = fichajeDate.getMinutes();
    const fichajeMinutes = fichajeHour * 60 + fichajeMinute;

    console.log(`[selectClosestShift] Fichaje: ${fichajeHour}:${fichajeMinute.toString().padStart(2, '0')} (${fichajeMinutes} min) el ${dayName}`);

    // Filtrar solo los horarios activos ese día
    const activeShifts = shifts.filter(shift =>
        shift.activeDays && shift.activeDays.split(',').includes(dayName)
    );
    
    if (activeShifts.length === 0) {
        console.log(`[selectClosestShift] No active shifts for ${dayName}`);
        return null;
    }

    console.log(`[selectClosestShift] Found ${activeShifts.length} active shifts for ${dayName}:`);
    activeShifts.forEach(s => {
        console.log(`  - ${s.name}: ${s.horaEntrada} - ${s.horaSalida} (Tolerancia: ${s.toleranciaMinutos}min)`);
    });

    // MEJORA: Utilizar detectTurno para turnos con horario partido
    const splittedShifts = activeShifts.filter(s => s.horaEntradaTarde && s.horaSalidaMañana);
    const continuousShifts = activeShifts.filter(s => !s.horaEntradaTarde && !s.horaSalidaMañana);

    // Si hay turnos partidos, usar la lógica inteligente de detectTurno
    if (splittedShifts.length > 0) {
        for (const shift of splittedShifts) {
            try {
                // Convertir el shift a formato daySchedule para detectTurno
                const daySchedule = {
                    horaEntrada: shift.horaEntrada,
                    horaSalida: shift.horaSalida,
                    horaEntradaTarde: shift.horaEntradaTarde,
                    horaSalidaMañana: shift.horaSalidaMañana,
                    flexibleSchedule: shift.flexibleSchedule,
                    toleranciaMinutos: shift.toleranciaMinutos
                };

                const turnoInfo = detectTurno(fichajeDate, daySchedule);
                if (turnoInfo && turnoInfo.turno !== 'FLEXIBLE') {
                    const expectedEntryMinutes = timeToMinutes(turnoInfo.expectedEntry);
                    const diff = Math.abs(fichajeMinutes - expectedEntryMinutes);
                    
                    console.log(`[selectClosestShift] Turno partido detectado: ${turnoInfo.turno} (${turnoInfo.expectedEntry}-${turnoInfo.expectedExit}), Diff: ${diff}min`);
                    
                    // Si está dentro de la tolerancia o menos de 60min de diferencia
                    if (diff <= (shift.toleranciaMinutos || 10) || diff <= 60) {
                        console.log(`[selectClosestShift] ✅ SELECTED (turno partido): ${shift.name}`);
                        return shift;
                    }
                }
            } catch (e) {
                console.error('[selectClosestShift] Error detecting turno:', e);
            }
        }
    }

    // Para turnos continuos, buscar el más cercano con límite de diferencia máxima
    const MAX_DIFF_MINUTES = 120; // 2 horas máximo de diferencia
    let bestShift = null;
    let minDiff = Infinity;

    // Primero intentar encontrar uno dentro de la tolerancia
    for (const shift of [...continuousShifts, ...splittedShifts]) {
        const entradaMin = timeToMinutes(shift.horaEntrada);
        const diff = Math.abs(fichajeMinutes - entradaMin);
        
        console.log(`[selectClosestShift] Evaluando ${shift.name}: entrada ${shift.horaEntrada} (${entradaMin}min), diff: ${diff}min`);
        
        if (diff <= (shift.toleranciaMinutos || 10) && diff < minDiff) {
            bestShift = shift;
            minDiff = diff;
            console.log(`[selectClosestShift]   → Candidato dentro de tolerancia`);
        }
    }
    
    // Si ninguno está dentro de la tolerancia, buscar el más cercano pero con límite
    if (!bestShift) {
        console.log(`[selectClosestShift] No shift within tolerance, searching closest (max ${MAX_DIFF_MINUTES}min)`);
        
        for (const shift of [...continuousShifts, ...splittedShifts]) {
            const entradaMin = timeToMinutes(shift.horaEntrada);
            const diff = Math.abs(fichajeMinutes - entradaMin);
            
            // MEJORA: Solo considerar turnos que no estén demasiado lejos
            if (diff <= MAX_DIFF_MINUTES && diff < minDiff) {
                bestShift = shift;
                minDiff = diff;
                console.log(`[selectClosestShift]   → Nuevo candidato más cercano: ${shift.name} (${diff}min)`);
            } else if (diff > MAX_DIFF_MINUTES) {
                console.log(`[selectClosestShift]   → Descartado ${shift.name}: demasiado lejos (${diff}min > ${MAX_DIFF_MINUTES}min)`);
            }
        }
    }

    if (bestShift) {
        console.log(`[selectClosestShift] ✅ SELECTED: ${bestShift.name} (diff: ${minDiff}min)`);
    } else {
        console.log(`[selectClosestShift] ❌ No suitable shift found`);
    }
    
    return bestShift;
}

module.exports = { selectClosestShift, timeToMinutes };
