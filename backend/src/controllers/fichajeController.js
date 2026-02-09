const { PrismaClient, FichajeTipo } = require('@prisma/client');
const prisma = new PrismaClient();
const {
    calculateWorkedHours,
    isLateArrival,
    isEarlyDeparture,
    groupFichajesByDay,
    validateFichajeSequence,
    getLastFichajeOfDay,
    getNextFichajeTipo
} = require('../utils/fichajeUtils');

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

        // Obtener usuario para department
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener fichajes del día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayFichajes = await prisma.fichaje.findMany({
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
            return res.status(400).json({
                error: `Debes fichar ${expectedTipo === FichajeTipo.ENTRADA ? 'entrada' : 'salida'} primero`
            });
        }

        // Crear fichaje
        const fichaje = await prisma.fichaje.create({
            data: {
                userId,
                tipo,
                department: user.department,
                timestamp: new Date(),
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                accuracy: accuracy ? parseFloat(accuracy) : null
            }
        });

        // Determinar estado actual
        const hasActiveEntry = tipo === FichajeTipo.ENTRADA;

        res.json({
            fichaje,
            status: {
                hasActiveEntry,
                currentFichaje: hasActiveEntry ? fichaje : null
            }
        });
    } catch (error) {
        console.error('Error creating fichaje:', error);
        res.status(500).json({ error: 'Error al crear fichaje' });
    }
};

/**
 * GET /api/fichajes/current
 * Obtener fichaje activo del usuario autenticado
 */
exports.getCurrentFichaje = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Obtener fichajes del día actual
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

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

        res.json({
            hasActiveEntry,
            currentFichaje: hasActiveEntry ? lastFichaje : null
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

        const schedule = await prisma.departmentSchedule.findUnique({
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

        const schedule = await prisma.departmentSchedule.findUnique({
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
        const schedule = await prisma.departmentSchedule.findUnique({
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
