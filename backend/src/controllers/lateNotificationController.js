const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendTemplateEmail } = require('../services/emailService');

/**
 * POST /api/late-notifications
 * Crear notificación de llegada tarde (solo managers)
 */
exports.createLateNotification = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { userId, fichajeId, fecha } = req.body;
        console.log(`[DEBUG] createLateNotification by Manager: ${managerId} for User: ${userId}`);

        if (!userId || !fichajeId || !fecha) {
            return res.status(400).json({
                error: 'userId, fichajeId y fecha son obligatorios'
            });
        }

        // Verificar que el fichaje existe
        const fichaje = await prisma.fichaje.findUnique({
            where: { id: fichajeId },
            include: { user: true }
        });

        if (!fichaje) {
            return res.status(404).json({ error: 'Fichaje no encontrado' });
        }

        // Verificar que el manager puede enviar notificación a este usuario
        // (mismo departamento o es admin)
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
            select: { department: true, role: true, name: true }
        });

        if (manager.role !== 'ADMIN' && manager.department !== fichaje.user.department) {
            return res.status(403).json({
                error: 'No puedes enviar notificaciones a usuarios de otro departamento'
            });
        }

        // Verificar si ya existe una notificación para este fichaje
        const existing = await prisma.lateArrivalNotification.findFirst({
            where: { fichajeId }
        });

        if (existing) {
            console.log(`[DEBUG] Notification already exists for fichaje ${fichajeId}`);
            return res.status(400).json({
                error: 'Ya existe una notificación para este fichaje'
            });
        }

        // Crear notificación
        const notification = await prisma.lateArrivalNotification.create({
            data: {
                userId,
                managerId,
                fichajeId,
                fecha: new Date(fecha)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                fichaje: true
            }
        });

        console.log(`[DEBUG] LateNotification created: ${notification.id}`);

        // Crear también una notificación general para el usuario
        await prisma.notification.create({
            data: {
                userId,
                title: 'Aviso de llegada tarde',
                message: `Tu manager ${manager.role === 'ADMIN' ? 'el administrador' : manager.name} ha registrado una llegada tarde el ${new Date(fecha).toLocaleDateString('es-ES')}. Por favor, justifica tu ausencia.`,
                read: false,
                date: new Date()
            }
        });

        // 🔔 ENVIAR EMAIL AL EMPLEADO
        const emailVariables = {
            employeeName: notification.user.name,
            managerName: manager.name,
            date: new Date(fecha).toLocaleDateString('es-ES'),
            time: new Date(fichaje.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };

        await sendTemplateEmail(notification.user.email, 'LATE_ARRIVAL', emailVariables);

        res.json(notification);
    } catch (error) {
        console.error('Error creating late notification:', error);
        res.status(500).json({ error: 'Error al crear notificación' });
    }
};

/**
 * GET /api/late-notifications
 * Obtener notificaciones del usuario autenticado
 */
exports.getLateNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const notifications = await prisma.lateArrivalNotification.findMany({
            where: { userId },
            include: {
                manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                fichaje: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error getting late notifications:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
};

/**
 * POST /api/late-notifications/:id/justify
 * Justificar llegada tarde
 */
exports.justifyLateArrival = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const { justificacion } = req.body;
        console.log(`[DEBUG] justifyLateArrival: Notification ${id}, User ${userId}`);

        if (!justificacion || justificacion.trim().length === 0) {
            return res.status(400).json({
                error: 'La justificación es obligatoria'
            });
        }

        // Verificar que la notificación existe y pertenece al usuario
        const notification = await prisma.lateArrivalNotification.findUnique({
            where: { id },
            include: { manager: true }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        // Actualizar notificación
        const updated = await prisma.lateArrivalNotification.update({
            where: { id },
            data: {
                justificado: true,
                justificacionTexto: justificacion,
                leido: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                manager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                fichaje: true
            }
        });

        console.log(`[DEBUG] Notification justified. Manager ID to notify: ${notification.managerId}`);

        // Crear notificación para el manager
        const newNotif = await prisma.notification.create({
            data: {
                userId: notification.managerId,
                title: 'Justificación de llegada tarde',
                message: `${updated.user.name} ha justificado su llegada tarde del ${new Date(notification.fecha).toLocaleDateString('es-ES')}: "${justificacion}"`,
                read: false,
                date: new Date()
            }
        });
        console.log(`[DEBUG] Manager notification created: ${newNotif.id}`);

        res.json(updated);
    } catch (error) {
        console.error('Error justifying late arrival:', error);
        res.status(500).json({ error: 'Error al justificar llegada tarde' });
    }
};

/**
 * GET /api/late-notifications/sent
 * Obtener notificaciones enviadas por el manager (solo managers/admins)
 */
exports.getSentNotifications = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const userRole = req.user.role;
        console.log(`[DEBUG] getSentNotifications called by User: ${managerId}, Role: ${userRole}`);

        if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const notifications = await prisma.lateArrivalNotification.findMany({
            where: { managerId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        department: true
                    }
                },
                fichaje: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[DEBUG] Found ${notifications.length} sent notifications for manager ${managerId}`);
        res.json(notifications);
    } catch (error) {
        console.error('Error getting sent notifications:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones enviadas' });
    }
};

/**
 * PUT /api/late-notifications/:id/read
 * Marcar notificación como leída
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const notification = await prisma.lateArrivalNotification.findUnique({
            where: { id }
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        if (notification.userId !== userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        const updated = await prisma.lateArrivalNotification.update({
            where: { id },
            data: { leido: true }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error al marcar como leída' });
    }
};
