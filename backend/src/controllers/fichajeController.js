const { PrismaClient, FichajeTipo } = require('@prisma/client');
const prisma = new PrismaClient();
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
const { getScheduleForDay, detectTurno } = require('../services/smartScheduleService');
const { selectClosestShift } = require('../services/shiftAssignmentService');

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
        const { tipo } = req.body;

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

            // Crear fichaje
            const fichaje = await tx.fichaje.create({
                data: {
                    userId,
                    tipo,
                    department: user.department,
                    timestamp: now
                }
            });

            return { fichaje, department: user.department };
        });

        // Determinar estado actual
        const hasActiveEntry = tipo === FichajeTipo.ENTRADA;

        // Buscar todos los horarios del departamento y asignar el más cercano
        let assignedShift = null;
        let turnoInfo = null;
        try {
            const shifts = await prisma.departmentShift.findMany({
                where: { department: result.department }
            });
            if (shifts && shifts.length > 0) {
                assignedShift = selectClosestShift(shifts, new Date(result.fichaje.timestamp));
                if (assignedShift && tipo === FichajeTipo.ENTRADA) {
                    // Usar detectTurno si es necesario, adaptando a la estructura de shift
                    turnoInfo = {
                        turno: assignedShift.name,
                        expectedEntry: assignedShift.horaEntrada,
                        expectedExit: assignedShift.horaSalida,
                        tolerancia: assignedShift.toleranciaMinutos
                    };
                }
            }
        } catch (e) {
            console.error('Error asignando turno:', e);
        }

        res.json({
            fichaje: result.fichaje,
            status: {
                hasActiveEntry,
                currentFichaje: hasActiveEntry ? result.fichaje : null
            },
            turno: turnoInfo,
            assignedShift
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
                const schedule = await prisma.departmentSchedule.findFirst({
                    where: { department: user.department }
                });
                if (schedule) {
                    const daySchedule = getScheduleForDay(schedule, new Date(lastFichaje.timestamp));
                    if (daySchedule) {
                        turnoInfo = detectTurno(new Date(lastFichaje.timestamp), daySchedule);
                    }
                }
            } catch (e) {
                console.error('Error detecting current turno:', e);
            }
        }

        res.json({
            hasActiveEntry,
            currentFichaje: hasActiveEntry ? lastFichaje : null,
            turno: turnoInfo
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

        // Solo admins y managers pueden ver fichajes de otros usuarios
        if (userId !== requestUserId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
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

        const schedule = await prisma.departmentSchedule.findFirst({
            where: { department: user.department }
        });

        const grouped = groupFichajesByDay(fichajes, schedule);

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

        // Solo admins y managers pueden ver fichajes de otros usuarios
        if (userId !== requestUserId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Obtener inicio y fin del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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

        const schedule = await prisma.departmentSchedule.findFirst({
            where: { department: user.department }
        });

        const grouped = groupFichajesByDay(fichajes, schedule);

        res.json(grouped);
    } catch (error) {
        console.error('Error getting month fichajes:', error);
        res.status(500).json({ error: 'Error al obtener fichajes del mes' });
    }
};

/**
 * GET /api/fichajes/report
 * Genera un CSV de reporte mensual de asistencia
 * Query params: month (1-12), year (YYYY), userId (optional, admin only)
 */
exports.getAttendanceReport = async (req, res) => {
    try {
        const requestUserId = req.user.userId;
        const userRole = req.user.role;
        const { month, year, userId } = req.query;

        const reportMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const reportYear = year ? parseInt(year) : new Date().getFullYear();

        // Only admins can view other users' reports
        const targetUserId = (userRole === 'ADMIN' && userId) ? userId : requestUserId;

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, name: true, email: true, department: true, position: true }
        });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Get schedule
        const schedule = await prisma.departmentSchedule.findFirst({
            where: { department: user.department }
        });

        // Date range for the month
        const startOfMonth = new Date(reportYear, reportMonth - 1, 1);
        const endOfMonth = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

        // Get fichajes
        const fichajes = await prisma.fichaje.findMany({
            where: {
                userId: targetUserId,
                timestamp: { gte: startOfMonth, lte: endOfMonth }
            },
            orderBy: { timestamp: 'asc' }
        });

        // Get vacations/absences
        const vacations = await prisma.vacationRequest.findMany({
            where: {
                userId: targetUserId,
                OR: [
                    { startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } }
                ]
            }
        });

        // Group fichajes by day
        const grouped = groupFichajesByDay(fichajes, schedule);
        const fichajeMap = {};
        grouped.forEach(day => { fichajeMap[day.date] = day; });

        // Build CSV
        const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const lines = [];
        // BOM for Excel UTF-8
        const BOM = '\uFEFF';

        // Header info
        lines.push(`Reporte de Asistencia - ${monthNames[reportMonth - 1]} ${reportYear}`);
        lines.push(`Empleado;${user.name}`);
        lines.push(`Departamento;${user.department}`);
        lines.push(`Puesto;${user.position || '-'}`);
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

            lines.push(`${dateKey};${dayName};${firstEntry};${lastExit};${hoursStr};${status};${observations}`);
        }

        // Summary
        lines.push('');
        lines.push('RESUMEN');
        lines.push(`Días trabajados;${daysWorked}`);
        lines.push(`Días vacaciones;${daysVacation}`);
        lines.push(`Días ausente;${daysAbsent}`);
        lines.push(`Llegadas tarde;${daysLate}`);
        lines.push(`Total horas;${totalHours.toFixed(2)}`);

        const csv = BOM + lines.join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="reporte-asistencia-${user.name.replace(/\s+/g, '_')}-${reportYear}-${String(reportMonth).padStart(2, '0')}.csv"`);
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
                position: true
            }
        });

        // Obtener horario del departamento
        const schedule = await prisma.departmentSchedule.findFirst({
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
        const userFichajes = users.map(user => {
            const userFichajesData = fichajes.filter(f => f.userId === user.id);
            const grouped = groupFichajesByDay(userFichajesData, schedule);

            return {
                user,
                fichajes: grouped
            };
        });

        res.json({
            department: dept,
            schedule,
            users: userFichajes
        });
    } catch (error) {
        console.error('Error getting department week fichajes:', error);
        res.status(500).json({ error: 'Error al obtener fichajes del departamento' });
    }
};
