const { PrismaClient, FichajeTipo } = require('@prisma/client');
const prisma = require('../lib/prisma');
const {
    calculateWorkedHours,
    isLateArrival,
    isEarlyDeparture,
    groupFichajesByDay,
    validateFichajeSequence,
    getLastFichajeOfDay,
    getNextFichajeTipo,
    getTodayRange
} = require('../utils/fichajeUtils');
const { selectClosestShift } = require('../services/shiftAssignmentService');
const { validateFichajeLocation } = require('../utils/gpsUtils');
const { loadOverrideMap, applyOverrideToShift } = require('../services/scheduleOverrideService');

// Custom error class for validation errors
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
    }
}

/**
 * POST /api/fichajes
 * Crear nuevo fichaje (entrada o salida)
 */
exports.createFichaje = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tipo, latitude, longitude, accuracy } = req.body;

        if (!tipo || !Object.values(FichajeTipo).includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de fichaje inválido' });
        }

        // Use transaction to prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Capture timestamp at the start for consistency
            const now = new Date();

            // Obtener usuario para department dentro de la transacción
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { department: true }
            });

            if (!user) {
                throw new ValidationError('Usuario no encontrado');
            }

            // Validar que el usuario tenga un departamento asignado
            if (!user.department) {
                throw new ValidationError('Usuario sin departamento asignado. Contacta con administración.');
            }

            // ✅ VALIDACIÓN GPS
            // Obtener ubicación de oficina del departamento
            const officeLocationSetting = await tx.globalSettings.findUnique({
                where: { key: `officeLocation_${user.department}` }
            });

            let gpsValidation = { valid: true, distance: null, message: null };

            if (officeLocationSetting && officeLocationSetting.value) {
                try {
                    const officeLocation = JSON.parse(officeLocationSetting.value);
                    
                    // Si hay configuración de oficina, validar ubicación
                    if (latitude !== undefined && longitude !== undefined) {
                        gpsValidation = validateFichajeLocation(
                            officeLocation,
                            { latitude, longitude, accuracy },
                            officeLocation.maxDistance || 500 // maxDistance configurable por departamento
                        );

                        if (!gpsValidation.valid) {
                            throw new ValidationError(gpsValidation.message);
                        }
                    } else {
                        // Si la oficina requiere GPS pero no se envió
                        if (officeLocation.required) {
                            throw new ValidationError('Se requiere ubicación GPS para fichar en este departamento. Habilita los permisos de ubicación.');
                        }
                    }
                } catch (parseError) {
                    console.error('Error parsing office location:', parseError);
                    // Continuar sin validación GPS si hay error en configuración
                }
            }

            // Obtener fichajes del día actual dentro de la transacción
            const { today, tomorrow } = getTodayRange(now);

            const todayFichajes = await tx.fichaje.findMany({
                where: {
                    userId,
                    timestamp: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                orderBy: { timestamp: 'asc' }
            });

            // Validar secuencia
            const lastFichaje = getLastFichajeOfDay(todayFichajes);
            const expectedTipo = getNextFichajeTipo(lastFichaje);

            if (tipo !== expectedTipo) {
                throw new ValidationError(`Debes fichar ${expectedTipo === FichajeTipo.ENTRADA ? 'entrada' : 'salida'} primero`);
            }

            // Crear fichaje con coordenadas GPS
            const fichaje = await tx.fichaje.create({
                data: {
                    userId,
                    tipo,
                    department: user.department,
                    timestamp: now,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    accuracy: accuracy || null
                }
            });

            return { fichaje, department: user.department, gpsValidation };
        });

        // Determinar estado actual
        const hasActiveEntry = tipo === FichajeTipo.ENTRADA;

        // Buscar todos los horarios del departamento y asignar el más cercano
        let assignedShift = null;
        let turnoInfo = null;
        let shiftWarning = null;
        
        try {
            let shifts = await prisma.departmentShift.findMany({
                where: { department: result.department }
            });

            // Excepcion de horario del dia (usuario/departamento): ajusta o anula los turnos de hoy
            const todayStr = new Date(result.fichaje.timestamp).toISOString().slice(0, 10);
            const todayOverride = (await loadOverrideMap(result.department, userId, todayStr, todayStr)).get(todayStr);
            if (todayOverride) {
                shifts = shifts.map(sh => applyOverrideToShift(sh, todayOverride)).filter(Boolean);
                if (todayOverride.dayOff) {
                    shiftWarning = 'Hoy tienes un dia libre configurado por la empresa.';
                } else if (shifts.length === 0 && todayOverride.horaEntrada && todayOverride.horaSalida) {
                    shifts = [{ id: 'override', department: result.department, name: 'Horario especial', activeDays: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES,SABADO,DOMINGO',
                        horaEntrada: todayOverride.horaEntrada, horaSalida: todayOverride.horaSalida, horaEntradaTarde: null, horaSalidaMañana: null,
                        toleranciaMinutos: todayOverride.toleranciaMinutos != null ? todayOverride.toleranciaMinutos : 10, flexibleSchedule: false }];
                }
            }

            if (shifts && shifts.length > 0) {
                console.log(`[fichajeController] Found ${shifts.length} shifts for department ${result.department}`);
                assignedShift = selectClosestShift(shifts, new Date(result.fichaje.timestamp));
                
                if (assignedShift && tipo === FichajeTipo.ENTRADA) {
                    const fichajeTime = new Date(result.fichaje.timestamp);
                    const fichajeMinutes = fichajeTime.getHours() * 60 + fichajeTime.getMinutes();
                    const entryMinutes = parseInt(assignedShift.horaEntrada.split(':')[0]) * 60 + parseInt(assignedShift.horaEntrada.split(':')[1]);
                    const diffMinutes = Math.abs(fichajeMinutes - entryMinutes);
                    
                    // Usar detectTurno si es necesario, adaptando a la estructura de shift
                    turnoInfo = {
                        label: assignedShift.name, // clients read `label`
                        turno: assignedShift.name,
                        expectedEntry: assignedShift.horaEntrada,
                        expectedExit: assignedShift.horaSalida,
                        tolerancia: assignedShift.toleranciaMinutos,
                        diffMinutes: diffMinutes
                    };
                    
                    // Si la diferencia es mayor a 30 minutos, avisar al usuario
                    if (diffMinutes > 30) {
                        shiftWarning = `Fichaje asignado al turno "${assignedShift.name}" (${assignedShift.horaEntrada}-${assignedShift.horaSalida}). Si no es correcto, contacta con tu supervisor.`;
                    }
                    
                    console.log(`[fichajeController] ✅ Assigned shift: ${assignedShift.name} (diff: ${diffMinutes}min)`);
                } else if (!assignedShift) {
                    console.log('[fichajeController] ⚠️ No shift could be assigned');
                    shiftWarning = 'No se pudo asignar un turno automáticamente. Contacta con tu supervisor.';
                }
            } else {
                console.log(`[fichajeController] ⚠️ No shifts defined for department ${result.department}`);
            }
        } catch (e) {
            console.error('[fichajeController] Error asignando turno:', e);
        }

        res.json({
            fichaje: result.fichaje,
            status: {
                hasActiveEntry,
                currentFichaje: hasActiveEntry ? result.fichaje : null
            },
            turno: turnoInfo,
            assignedShift,
            warning: shiftWarning,
            gpsValidation: result.gpsValidation // Información de validación GPS
        });
    } catch (error) {
        console.error('Error creating fichaje:', error);

        // Handle specific validation errors
        if (error instanceof ValidationError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        res.status(500).json({ error: 'Error al crear fichaje. Por favor, inténtalo de nuevo.' });
    }
};

/**
 * GET /api/fichajes/current
 * Obtener fichaje activo del usuario autenticado
 */
exports.getCurrentFichaje = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Obtener fichajes del día actual usando fecha local consistente
        const { today, tomorrow } = getTodayRange();

        const todayFichajes = await prisma.fichaje.findMany({
            where: {
                userId,
                timestamp: {
                    gte: today,
                    lt: tomorrow
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        const lastFichaje = todayFichajes[0] || null;
        const hasActiveEntry = lastFichaje?.tipo === FichajeTipo.ENTRADA;

        let turnoInfo = null;
        if (hasActiveEntry) {
            try {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                const shifts = await prisma.departmentShift.findMany({
                    where: { department: user.department }
                });
                if (shifts && shifts.length > 0) {
                    const assignedShift = selectClosestShift(shifts, new Date(lastFichaje.timestamp));
                    if (assignedShift) {
                        const fichajeTime = new Date(lastFichaje.timestamp);
                        const fichajeMinutes = fichajeTime.getHours() * 60 + fichajeTime.getMinutes();
                        const entryMinutes = parseInt(assignedShift.horaEntrada.split(':')[0]) * 60 + parseInt(assignedShift.horaEntrada.split(':')[1]);
                        const diffMinutes = Math.abs(fichajeMinutes - entryMinutes);
                        turnoInfo = {
                            label: assignedShift.name, // clients read `label`
                            turno: assignedShift.name,
                            expectedEntry: assignedShift.horaEntrada,
                            expectedExit: assignedShift.horaSalida,
                            tolerancia: assignedShift.toleranciaMinutos,
                            diffMinutes: diffMinutes
                        };
                    }
                }
            } catch (e) {
                console.error('Error detecting current turno:', e);
            }
        }

        // An entry from a previous day with no exit afterwards (forgot to clock out)
        const lastBefore = await prisma.fichaje.findFirst({
            where: { userId, timestamp: { lt: today } },
            orderBy: { timestamp: 'desc' },
        });
        const missingExit = lastBefore?.tipo === FichajeTipo.ENTRADA ? lastBefore : null;

        res.json({
            hasActiveEntry,
            currentFichaje: hasActiveEntry ? lastFichaje : null,
            turno: turnoInfo,
            missingExit
        });
    } catch (error) {
        console.error('Error getting current fichaje:', error);
        res.status(500).json({ error: 'Error al obtener fichaje actual' });
    }
};

/**
 * GET /api/fichajes/history
 * Historial de fichajes con filtros
 */
exports.getHistory = async (req, res) => {
    try {
        const { userId, startDate, endDate, department } = req.query;
        const requestUserId = req.user.userId;
        const userRole = req.user.role;

        // Solo admins pueden ver fichajes de otros usuarios
        const targetUserId = (userRole === 'ADMIN' && userId) ? userId : requestUserId;

        const where = {
            userId: targetUserId
        };

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.timestamp.lte = end;
            }
        }

        if (department && userRole === 'ADMIN') {
            where.department = department;
            delete where.userId; // Si filtramos por departamento, no filtrar por usuario
        }

        const fichajes = await prisma.fichaje.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        res.json(fichajes);
    } catch (error) {
        console.error('Error getting fichaje history:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

/**
 * GET /api/fichajes/week/:userId
 * Fichajes de la semana de un usuario
 */
exports.getWeek = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestUserId = req.user.userId;
        const userRole = req.user.role;

        // Admins: todos. Managers: solo su departamento. Resto: solo el propio.
        if (userId !== requestUserId && userRole !== 'ADMIN') {
            if (userRole !== 'MANAGER') {
                return res.status(403).json({ error: 'No autorizado' });
            }
            const target = await prisma.user.findUnique({ where: { id: userId }, select: { department: true } });
            if (!target || target.department !== req.user.department) {
                return res.status(403).json({ error: 'No autorizado' });
            }
        }

        // Obtener inicio y fin de la semana actual
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const fichajes = await prisma.fichaje.findMany({
            where: {
                userId,
                timestamp: {
                    gte: startOfWeek,
                    lt: endOfWeek
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        // Obtener horario del departamento
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        if (!user || !user.department) {
            return res.status(404).json({ error: 'Usuario o departamento no encontrado' });
        }

        // Get shifts (DepartmentShift) - unified model
        const shifts = await prisma.departmentShift.findMany({
            where: { department: user.department }
        });

        const overrideMap = await loadOverrideMap(user.department, userId,
            startOfWeek.toISOString().slice(0, 10), endOfWeek.toISOString().slice(0, 10));
        const grouped = groupFichajesByDay(fichajes, shifts, overrideMap);

        res.json(grouped);
    } catch (error) {
        console.error('Error getting week fichajes:', error);
        res.status(500).json({ error: 'Error al obtener fichajes de la semana' });
    }
};

/**
 * GET /api/fichajes/month/:userId
 * Fichajes del mes completo
 */
exports.getMonth = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestUserId = req.user.userId;
        const userRole = req.user.role;

        // Admins: todos. Managers: solo su departamento. Resto: solo el propio.
        if (userId !== requestUserId && userRole !== 'ADMIN') {
            if (userRole !== 'MANAGER') {
                return res.status(403).json({ error: 'No autorizado' });
            }
            const target = await prisma.user.findUnique({ where: { id: userId }, select: { department: true } });
            if (!target || target.department !== req.user.department) {
                return res.status(403).json({ error: 'No autorizado' });
            }
        }

        // Mes pedido (?year=YYYY&month=1-12) o, por defecto, el actual
        const now = new Date();
        const qYear = parseInt(req.query.year, 10);
        const qMonth = parseInt(req.query.month, 10);
        const year = Number.isInteger(qYear) && qYear >= 2000 && qYear <= 2100 ? qYear : now.getFullYear();
        const monthIdx = Number.isInteger(qMonth) && qMonth >= 1 && qMonth <= 12 ? qMonth - 1 : now.getMonth();
        const startOfMonth = new Date(year, monthIdx, 1);
        const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

        const fichajes = await prisma.fichaje.findMany({
            where: {
                userId,
                timestamp: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        // Obtener horario del departamento
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        if (!user || !user.department) {
            return res.status(404).json({ error: 'Usuario o departamento no encontrado' });
        }

        // Get shifts (DepartmentShift) - unified model
        const shifts = await prisma.departmentShift.findMany({
            where: { department: user.department }
        });

        const overrideMap = await loadOverrideMap(user.department, userId,
            startOfMonth.toISOString().slice(0, 10), endOfMonth.toISOString().slice(0, 10));
        const grouped = groupFichajesByDay(fichajes, shifts, overrideMap);

        res.json(grouped);
    } catch (error) {
        console.error('Error getting month fichajes:', error);
        res.status(500).json({ error: 'Error al obtener fichajes del mes' });
    }
};

/**
 * Celda CSV segura: neutraliza fórmulas (inyección CSV en Excel) y quita separadores/saltos de línea.
 */
function csvCell(value) {
    let v = String(value ?? '').replace(/[;\r\n]+/g, ' ').trim();
    if (/^[=+\-@\t]/.test(v)) v = `'${v}`;
    return v;
}

/**
 * Construye las lineas CSV del reporte mensual de un usuario (compartido por reporte individual y de departamento)
 */
async function buildUserReportLines(user, reportMonth, reportYear) {
    const targetUserId = user.id;
    const shifts = await prisma.departmentShift.findMany({ where: { department: user.department } });

    const startOfMonth = new Date(reportYear, reportMonth - 1, 1);
    const endOfMonth = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

    const fichajes = await prisma.fichaje.findMany({
        where: { userId: targetUserId, timestamp: { gte: startOfMonth, lte: endOfMonth } },
        orderBy: { timestamp: 'asc' }
    });
    const vacations = await prisma.vacationRequest.findMany({
        where: {
            userId: targetUserId,
            OR: [{ startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } }]
        }
    });

    const overrideMap = await loadOverrideMap(user.department, targetUserId,
        startOfMonth.toISOString().slice(0, 10), endOfMonth.toISOString().slice(0, 10));
    const grouped = groupFichajesByDay(fichajes, shifts, overrideMap);
    const fichajeMap = {};
    grouped.forEach(day => { fichajeMap[day.date] = day; });

    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const lines = [];

        // Header info
        lines.push(`Reporte de Asistencia - ${monthNames[reportMonth - 1]} ${reportYear}`);
        lines.push(`Empleado;${csvCell(user.name)}`);
        lines.push(`Departamento;${csvCell(user.department)}`);
        lines.push(`Puesto;${csvCell(user.position || '-')}`);
        lines.push('');
        lines.push('Fecha;Día;Primera Entrada;Última Salida;Horas Trabajadas;Estado;Observaciones');

        const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
        let totalHours = 0;
        let daysWorked = 0;
        let daysAbsent = 0;
        let daysVacation = 0;
        let daysLate = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(reportYear, reportMonth - 1, d);
            const dateKey = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isFuture = date > new Date();

            // Check vacation/absence
            const vacation = vacations.find(v => {
                const start = new Date(v.startDate);
                const end = new Date(v.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return date >= start && date <= end;
            });

            const stats = fichajeMap[dateKey];

            let firstEntry = '-';
            let lastExit = '-';
            let hoursStr = '-';
            let status = '';
            let observations = '';

            if (isWeekend && !vacation && !stats) {
                status = 'Fin de semana';
            } else if (isFuture) {
                status = '-';
            } else if (vacation) {
                const typeMap = {
                    'VACATION': 'Vacaciones',
                    'PERSONAL': 'Permiso personal',
                    'SICK_LEAVE': 'Horas médicas',
                    'MEDICAL_LEAVE': 'Baja médica',
                    'OVERTIME': 'Compensación horas',
                    'OTHER': 'Otro permiso'
                };
                status = typeMap[vacation.type] || vacation.type;
                observations = vacation.status === 'APPROVED' ? 'Aprobado' : vacation.status === 'REJECTED' ? 'Rechazado' : 'Pendiente';
                if (vacation.type === 'VACATION') daysVacation++;
            } else if (stats) {
                const sortedFichajes = stats.fichajes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const entradas = sortedFichajes.filter(f => f.tipo === 'ENTRADA');
                const salidas = sortedFichajes.filter(f => f.tipo === 'SALIDA');

                if (entradas.length > 0) {
                    firstEntry = new Date(entradas[0].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                }
                if (salidas.length > 0) {
                    lastExit = new Date(salidas[salidas.length - 1].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                }

                hoursStr = stats.horasTrabajadas.toFixed(2);
                totalHours += stats.horasTrabajadas;
                daysWorked++;

                if (stats.isComplete && !stats.isLate && !stats.isEarlyDeparture) {
                    status = 'Correcto';
                } else {
                    const issues = [];
                    if (stats.isLate) { issues.push('Llegada tarde'); daysLate++; }
                    if (stats.isEarlyDeparture) issues.push('Salida anticipada');
                    if (!stats.isComplete) issues.push('Incompleto');
                    status = 'Incidencia';
                    observations = issues.join(', ');
                }
            } else if (!isWeekend) {
                status = 'No fichado';
                observations = 'Ausencia sin justificar';
                daysAbsent++;
            }

            lines.push(`${dateKey};${dayName};${firstEntry};${lastExit};${hoursStr};${csvCell(status)};${csvCell(observations)}`);
        }

        // Summary
        lines.push('');
        lines.push('RESUMEN');
        lines.push(`Días trabajados;${daysWorked}`);
        lines.push(`Días vacaciones;${daysVacation}`);
        lines.push(`Días ausente;${daysAbsent}`);
        lines.push(`Llegadas tarde;${daysLate}`);
        lines.push(`Total horas;${totalHours.toFixed(2)}`);
    return lines;
}

/**
 * GET /api/fichajes/report
 * Genera un CSV de reporte mensual de asistencia
 * Query params: month (1-12), year (YYYY), userId (opcional), department (opcional, reporte de todo el departamento)
 *  - ADMIN: cualquier usuario o departamento.
 *  - MANAGER: solo usuarios/departamento propios (403 si se pide otro departamento/usuario ajeno).
 *  - EMPLOYEE: siempre el propio (userId/department se ignoran).
 */
exports.getAttendanceReport = async (req, res) => {
    try {
        const requestUserId = req.user.userId;
        const userRole = req.user.role;
        const { month, year, userId, department } = req.query;

        const reportMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const reportYear = year ? parseInt(year) : new Date().getFullYear();
        if (!(reportMonth >= 1 && reportMonth <= 12) || !(reportYear >= 2000 && reportYear <= 2100)) {
            return res.status(400).json({ error: 'month/year invalidos' });
        }

        const select = { id: true, name: true, email: true, department: true, position: true };
        let targets = [];
        let fileLabel;

        if (department && (userRole === 'ADMIN' || userRole === 'MANAGER')) {
            if (userRole === 'MANAGER' && department !== req.user.department) {
                return res.status(403).json({ error: 'No autorizado para este departamento', code: 'DEPARTMENT_FORBIDDEN' });
            }
            targets = await prisma.user.findMany({ where: { department: String(department) }, select, orderBy: { name: 'asc' } });
            if (targets.length === 0) return res.status(404).json({ error: 'Departamento sin usuarios' });
            fileLabel = 'dept-' + String(department);
        } else {
            let targetUserId = requestUserId;
            if (userId && userId !== requestUserId) {
                if (userRole === 'ADMIN') {
                    targetUserId = String(userId);
                } else if (userRole === 'MANAGER') {
                    const t = await prisma.user.findUnique({ where: { id: String(userId) }, select: { department: true } });
                    if (!t || t.department !== req.user.department) {
                        return res.status(403).json({ error: 'No autorizado', code: 'DEPARTMENT_FORBIDDEN' });
                    }
                    targetUserId = String(userId);
                } // EMPLOYEE: se ignora userId (comportamiento previo)
            }
            const user = await prisma.user.findUnique({ where: { id: targetUserId }, select });
            if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
            targets = [user];
            fileLabel = user.name;
        }

        const lines = [];
        for (let i = 0; i < targets.length; i++) {
            if (i > 0) { lines.push(''); lines.push(''); }
            lines.push(...await buildUserReportLines(targets[i], reportMonth, reportYear));
        }

        const BOM = '\uFEFF'; // Excel UTF-8
        const csv = BOM + lines.join('\r\n');
        const safeLabel = String(fileLabel).replace(/[^A-Za-z0-9_-]+/g, '_');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="reporte-asistencia-${safeLabel}-${reportYear}-${String(reportMonth).padStart(2, '0')}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Error generating attendance report:', error);
        res.status(500).json({ error: 'Error al generar reporte de asistencia' });
    }
};

/**
 * GET /api/fichajes/department/:dept/week
 * Fichajes semanales por departamento (solo managers/admins)
 */
exports.getDepartmentWeek = async (req, res) => {
    try {
        const { dept } = req.params;
        const userRole = req.user.role;
        const userDepartment = req.user.department;

        // Managers solo pueden ver su departamento, admins pueden ver todos
        if (userRole === 'MANAGER' && dept !== userDepartment) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Obtener inicio y fin de la semana actual
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        // Obtener todos los usuarios del departamento (excluyendo admins)
        const users = await prisma.user.findMany({
            where: {
                department: dept,
                role: { not: 'ADMIN' }
            },
            select: {
                id: true,
                name: true,
                email: true,
                position: true,
                active: true
            }
        });

        // Obtener turnos del departamento (DepartmentShift)
        const shifts = await prisma.departmentShift.findMany({
            where: { department: dept }
        });

        // Obtener fichajes de todos los usuarios del departamento
        const fichajes = await prisma.fichaje.findMany({
            where: {
                department: dept,
                timestamp: {
                    gte: startOfWeek,
                    lt: endOfWeek
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lateNotifications: {
                    select: {
                        id: true,
                        leido: true,
                        justificado: true
                    }
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        // Agrupar por usuario
        const deptOverrides = await prisma.scheduleOverride.findMany({
            where: { department: dept, date: { gte: startOfWeek.toISOString().slice(0, 10), lte: endOfWeek.toISOString().slice(0, 10) } }
        });
        const userFichajes = users.map(user => {
            const userFichajesData = fichajes.filter(f => f.userId === user.id);
            const overrideMap = new Map();
            deptOverrides.filter(o => o.userKey === '').forEach(o => overrideMap.set(o.date, o));
            deptOverrides.filter(o => o.userKey === user.id).forEach(o => overrideMap.set(o.date, o));
            const grouped = groupFichajesByDay(userFichajesData, shifts, overrideMap);

            return {
                user,
                fichajes: grouped
            };
        });

        res.json({
            department: dept,
            schedule: shifts && shifts.length > 0 ? shifts[0] : null,
            shifts,
            users: userFichajes
        });
    } catch (error) {
        console.error('Error getting department week fichajes:', error);
        res.status(500).json({ error: 'Error al obtener fichajes del departamento' });
    }
};
