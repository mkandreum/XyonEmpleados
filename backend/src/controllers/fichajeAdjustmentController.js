const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/fichaje-adjustments
 * Crear solicitud de ajuste de fichaje (empleado)
 */
exports.create = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fichajeId, requestedTimestamp, reason } = req.body;

        if (!fichajeId || !requestedTimestamp || !reason) {
            return res.status(400).json({
                error: 'Se requieren fichajeId, requestedTimestamp y reason'
            });
        }

        if (reason.trim().length < 5) {
            return res.status(400).json({
                error: 'El motivo debe tener al menos 5 caracteres'
            });
        }

        // Verify the fichaje exists and belongs to the user
        const fichaje = await prisma.fichaje.findUnique({
            where: { id: fichajeId },
            include: { user: { select: { id: true, department: true } } }
        });

        if (!fichaje) {
            return res.status(404).json({ error: 'Fichaje no encontrado' });
        }

        if (fichaje.userId !== userId) {
            return res.status(403).json({ error: 'No puedes ajustar fichajes de otro usuario' });
        }

        // Check if there's already a pending adjustment for this fichaje
        const existingAdjustment = await prisma.fichajeAdjustment.findFirst({
            where: {
                fichajeId,
                status: 'PENDING'
            }
        });

        if (existingAdjustment) {
            return res.status(400).json({
                error: 'Ya existe una solicitud de ajuste pendiente para este fichaje'
            });
        }

        // Create the adjustment request
        const adjustment = await prisma.fichajeAdjustment.create({
            data: {
                fichajeId,
                userId,
                originalTimestamp: fichaje.timestamp,
                requestedTimestamp: new Date(requestedTimestamp),
                reason: reason.trim()
            },
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, email: true, department: true } }
            }
        });

        res.status(201).json(adjustment);
    } catch (error) {
        console.error('Error creating fichaje adjustment:', error);
        res.status(500).json({ error: 'Error al crear solicitud de ajuste' });
    }
};

/**
 * GET /api/fichaje-adjustments
 * Obtener mis solicitudes de ajuste (empleado)
 */
exports.getMyRequests = async (req, res) => {
    try {
        const userId = req.user.userId;

        const adjustments = await prisma.fichajeAdjustment.findMany({
            where: { userId },
            include: {
                fichaje: true,
                manager: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(adjustments);
    } catch (error) {
        console.error('Error getting my adjustments:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

/**
 * GET /api/fichaje-adjustments/pending
 * Obtener solicitudes pendientes de mi equipo (manager/admin)
 */
exports.getPending = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Get the requesting user's department
        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        let where = { status: 'PENDING' };

        // Managers can only see their department's requests
        if (userRole === 'MANAGER') {
            where.user = { department: requestingUser.department };
        }
        // Admins can see all departments

        const adjustments = await prisma.fichajeAdjustment.findMany({
            where,
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, email: true, department: true } }
            },
            orderBy: { createdAt: 'asc' } // FIFO
        });

        res.json(adjustments);
    } catch (error) {
        console.error('Error getting pending adjustments:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes pendientes' });
    }
};

/**
 * GET /api/fichaje-adjustments/all
 * Obtener todas las solicitudes (manager/admin) con historial
 */
exports.getAll = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        let where = {};

        if (userRole === 'MANAGER') {
            where.user = { department: requestingUser.department };
        }

        const adjustments = await prisma.fichajeAdjustment.findMany({
            where,
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, email: true, department: true } },
                manager: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json(adjustments);
    } catch (error) {
        console.error('Error getting all adjustments:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

/**
 * PATCH /api/fichaje-adjustments/:id/approve
 * Aprobar solicitud (manager/admin) — actualiza el timestamp del fichaje
 */
exports.approve = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user.userId;
        const managerRole = req.user.role;

        const adjustment = await prisma.fichajeAdjustment.findUnique({
            where: { id },
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, department: true } }
            }
        });

        if (!adjustment) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (adjustment.status !== 'PENDING') {
            return res.status(400).json({ error: 'Esta solicitud ya fue procesada' });
        }

        // Managers can only approve within their department
        if (managerRole === 'MANAGER') {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                select: { department: true }
            });

            if (manager.department !== adjustment.user.department) {
                return res.status(403).json({ error: 'No puedes aprobar solicitudes de otro departamento' });
            }
        }

        // Use transaction: update adjustment + update fichaje timestamp
        const result = await prisma.$transaction(async (tx) => {
            // 1. Approve the adjustment
            const approved = await tx.fichajeAdjustment.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    managerId,
                    resolvedAt: new Date()
                }
            });

            // 2. Update the fichaje timestamp
            await tx.fichaje.update({
                where: { id: adjustment.fichajeId },
                data: { timestamp: adjustment.requestedTimestamp }
            });

            return approved;
        });

        // Return with full data
        const updated = await prisma.fichajeAdjustment.findUnique({
            where: { id },
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, email: true, department: true } },
                manager: { select: { id: true, name: true } }
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error approving adjustment:', error);
        res.status(500).json({ error: 'Error al aprobar solicitud' });
    }
};

/**
 * PATCH /api/fichaje-adjustments/:id/reject
 * Rechazar solicitud (manager/admin)
 */
exports.reject = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user.userId;
        const managerRole = req.user.role;
        const { rejectionReason } = req.body;

        const adjustment = await prisma.fichajeAdjustment.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, department: true } }
            }
        });

        if (!adjustment) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (adjustment.status !== 'PENDING') {
            return res.status(400).json({ error: 'Esta solicitud ya fue procesada' });
        }

        // Managers can only reject within their department
        if (managerRole === 'MANAGER') {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                select: { department: true }
            });

            if (manager.department !== adjustment.user.department) {
                return res.status(403).json({ error: 'No puedes rechazar solicitudes de otro departamento' });
            }
        }

        const rejected = await prisma.fichajeAdjustment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                managerId,
                rejectionReason: rejectionReason || null,
                resolvedAt: new Date()
            },
            include: {
                fichaje: true,
                user: { select: { id: true, name: true, email: true, department: true } },
                manager: { select: { id: true, name: true } }
            }
        });

        res.json(rejected);
    } catch (error) {
        console.error('Error rejecting adjustment:', error);
        res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
};
