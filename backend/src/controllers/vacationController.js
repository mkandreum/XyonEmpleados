const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createNotification } = require('./notificationController');

// Get all vacations for the requesting user
exports.getAllVacations = async (req, res) => {
    try {
        const vacations = await prisma.vacationRequest.findMany({
            where: { userId: req.user.userId },
            orderBy: { startDate: 'desc' }
        });
        res.json(vacations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vacations' });
    }
};

// Create vacation request (with role-based status)
exports.createVacation = async (req, res) => {
    try {
        const { startDate, endDate, days, type, justificationUrl } = req.body;

        // Fetch user to determine initial status
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { role: true, department: true, name: true }
        });

        // Determine initial status based on role
        let initialStatus = 'PENDING_MANAGER'; // Default for EMPLOYEE
        if (user.role === 'MANAGER') {
            initialStatus = 'PENDING_ADMIN'; // Managers skip Manager approval
        } else if (user.role === 'ADMIN') {
            initialStatus = 'APPROVED'; // Admins auto-approve (optional, could also be PENDING_ADMIN)
        }

        const request = await prisma.vacationRequest.create({
            data: {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                days,
                type,
                justificationUrl: justificationUrl || null,
                userId: req.user.userId,
                status: initialStatus
            }
        });

        // NOTIFICATION LOGIC
        const formattedStart = new Date(startDate).toLocaleDateString();
        const formattedEnd = new Date(endDate).toLocaleDateString();

        if (initialStatus === 'PENDING_MANAGER') {
            // Notify managers of the same department
            const managers = await prisma.user.findMany({
                where: {
                    department: user.department,
                    role: 'MANAGER',
                    NOT: { id: req.user.userId } // Don't notify self if manager requests
                }
            });
            for (const manager of managers) {
                await createNotification(
                    manager.id,
                    'Nueva Solicitud de Vacaciones',
                    `El empleado ${user.name} ha solicitado días desde el ${formattedStart} al ${formattedEnd}.`
                );
            }
        } else if (initialStatus === 'PENDING_ADMIN') {
            // Notify all ADMINS
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
            for (const admin of admins) {
                await createNotification(
                    admin.id,
                    'Nueva Solicitud Pendiente',
                    `El usuario ${user.name} ha solicitado vacaciones del ${formattedStart} al ${formattedEnd} (Aprobado por Manager o directo).`
                );
            }
        }

        res.json(request);
    } catch (error) {
        console.error("Create vacation error:", error);
        res.status(500).json({ error: 'Failed to create vacation request' });
    }
};

// Manager: Get team vacation requests (same department, PENDING_MANAGER)
exports.getTeamVacations = async (req, res) => {
    try {
        // Get manager's department
        const manager = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { department: true, role: true }
        });

        if (manager.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Only managers can access team requests' });
        }

        // Fetch all PENDING_MANAGER requests from the same department
        const teamRequests = await prisma.vacationRequest.findMany({
            where: {
                status: 'PENDING_MANAGER',
                user: {
                    department: manager.department
                }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, position: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(teamRequests);
    } catch (error) {
        console.error("Get team vacations error:", error);
        res.status(500).json({ error: 'Failed to fetch team requests' });
    }
};

// Manager: Approve request (moves to PENDING_ADMIN)
exports.managerApproveVacation = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify manager role
        const manager = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { role: true, department: true }
        });

        if (manager.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Only managers can approve team requests' });
        }

        // Verify the request belongs to the same department
        const request = await prisma.vacationRequest.findUnique({
            where: { id },
            include: { user: { select: { department: true, name: true } } }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.user.department !== manager.department) {
            return res.status(403).json({ error: 'Request is not in your department' });
        }

        // Update to PENDING_ADMIN
        const updated = await prisma.vacationRequest.update({
            where: { id },
            data: { status: 'PENDING_ADMIN' }
        });

        // Notify Admins
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'Solicitud Aprobada por Manager',
                `El manager ha aprobado la solicitud de ${request.user.name}. Requiere tu revisión.`
            );
        }

        // Notify User
        await createNotification(
            request.userId,
            'Solicitud Actualizada',
            'Tu manager ha aprobado tu solicitud. Ahora está pendiente de RRHH/Admin.'
        );

        res.json(updated);
    } catch (error) {
        console.error("Manager approve error:", error);
        res.status(500).json({ error: 'Failed to approve request' });
    }
};

// Manager: Reject request
exports.managerRejectVacation = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify manager role
        const manager = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { role: true, department: true }
        });

        if (manager.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Only managers can reject team requests' });
        }

        const request = await prisma.vacationRequest.findUnique({
            where: { id },
            include: { user: { select: { department: true } } }
        });

        if (!request || request.user.department !== manager.department) {
            return res.status(403).json({ error: 'Request not found or not in your department' });
        }

        const updated = await prisma.vacationRequest.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        // Notify User
        await createNotification(
            request.userId,
            'Solicitud Rechazada',
            'Tu manager ha rechazado tu solicitud de vacaciones.'
        );

        res.json(updated);
    } catch (error) {
        console.error("Manager reject error:", error);
        res.status(500).json({ error: 'Failed to reject request' });
    }
};
