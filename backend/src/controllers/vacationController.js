const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { isOwnedPrivateFileUrl } = require('../utils/safeUrl');
const { createNotification } = require('./notificationController');
const { sendTemplateEmail } = require('../services/emailService');
const { notifyDepartmentManagers, notifyAllAdmins } = require('../services/notificationService');

// Get all vacations for the requesting user
exports.getAllVacations = async (req, res) => {
    try {
        const vacations = await prisma.vacationRequest.findMany({
            where: { userId: req.user.userId },
            orderBy: { startDate: 'desc' }
        });
        res.json(vacations);
    } catch (error) {
        console.error('Error fetching vacations:', error);
        res.status(500).json({ error: 'Failed to fetch vacations' });
    }
};

/** Days between two dates, both inclusive: natural (calendar) and business (Mon–Fri). */
function countDays(start, end) {
    const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    let natural = 0, business = 0;
    for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        natural++;
        const wd = d.getUTCDay();
        if (wd !== 0 && wd !== 6) business++;
    }
    return { natural, business };
}

// Create vacation request (with role-based status)
exports.createVacation = async (req, res) => {
    try {
        const { startDate, endDate, hours, type, justificationUrl } = req.body;

        // The client's day count is never trusted for balances: recompute it from the dates.
        // VACATION counts working days; other leave types may count calendar days (e.g. "Matrimonio").
        const { natural, business } = countDays(new Date(startDate), new Date(endDate));
        const isHoursRequest = Number(req.body.days) === 0 && Number(hours) > 0;
        let days;
        if (isHoursRequest) {
            if (natural !== 1) return res.status(400).json({ error: 'Las solicitudes por horas deben ser de un solo día' });
            days = 0;
        } else if (type === 'VACATION') {
            days = business;
        } else {
            days = Number(req.body.days) === natural ? natural : business;
        }
        if (!isHoursRequest && days < 1) {
            return res.status(400).json({ error: 'El rango elegido no incluye días laborables' });
        }
        if (justificationUrl && !isOwnedPrivateFileUrl(justificationUrl, 'justifications', req.user.userId, req.user.role)) {
            return res.status(400).json({ error: 'justificationUrl invalido' });
        }

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
                hours,
                type,
                subtype: req.body.subtype || null,
                justificationUrl: justificationUrl || null,
                userId: req.user.userId,
                status: initialStatus
            }
        });

        // NOTIFICATION LOGIC - Usando servicio centralizado
        const formattedStart = new Date(startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedEnd = new Date(endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

        if (initialStatus === 'PENDING_MANAGER') {
            // Notificar managers del mismo departamento (optimizado - 1 query)
            await notifyDepartmentManagers(
                user.department,
                'VACATION_PENDING_MANAGER',
                {
                    employeeName: user.name,
                    requestType: type,
                    startDate: formattedStart,
                    endDate: formattedEnd,
                    days
                }
            );
        } else if (initialStatus === 'PENDING_ADMIN') {
            // Notificar todos los admins (optimizado - 1 query)
            await notifyAllAdmins(
                'VACATION_PENDING_ADMIN',
                {
                    employeeName: user.name,
                    requestType: type,
                    startDate: formattedStart,
                    endDate: formattedEnd,
                    days
                }
            );
        }

        res.json(request);
    } catch (error) {
        console.error("Create vacation error:", error);
        res.status(500).json({ error: 'Failed to create vacation request' });
    }
};

// Update justification URL for an existing request (owner only)
exports.updateJustification = async (req, res) => {
    try {
        const { id } = req.params;
        const { justificationUrl } = req.body;

        if (!justificationUrl) {
            return res.status(400).json({ error: 'Justification URL is required' });
        }
        if (!isOwnedPrivateFileUrl(justificationUrl, 'justifications', req.user.userId, req.user.role)) {
            return res.status(400).json({ error: 'justificationUrl invalido' });
        }

        const request = await prisma.vacationRequest.findUnique({
            where: { id },
            include: { user: { select: { id: true, department: true, name: true } } }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Not allowed to update this request' });
        }

        const updated = await prisma.vacationRequest.update({
            where: { id },
            data: { justificationUrl }
        });

        const managers = await prisma.user.findMany({
            where: {
                department: request.user.department,
                role: 'MANAGER',
                active: true
            }
        });

        for (const manager of managers) {
            await createNotification(
                manager.id,
                'Justificante subido',
                `${request.user.name} ha subido un justificante para su solicitud.`
            );
        }

        res.json(updated);
    } catch (error) {
        console.error('Update justification error:', error);
        res.status(500).json({ error: 'Failed to update justification' });
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
                status: {
                    in: ['PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED']
                },
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

        if (request.status !== 'PENDING_MANAGER') {
            return res.status(409).json({ error: 'La solicitud no esta pendiente de manager' });
        }
        if (request.userId === req.user.userId) {
            return res.status(403).json({ error: 'No puedes aprobar tu propia solicitud' });
        }

        // Update to PENDING_ADMIN
        const updated = await prisma.vacationRequest.update({
            where: { id },
            data: { status: 'PENDING_ADMIN' }
        });

        // Notify Admins
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN', active: true } });
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'Solicitud Aprobada por Manager',
                `El manager ha aprobado la solicitud de ${request.user.name}. Requiere tu revisión.`
            );
        }

        // Notify User (in-app only, no email until Admin approves)
        await createNotification(
            request.userId,
            'Solicitud Actualizada',
            'Tu manager ha aprobado tu solicitud. Ahora está pendiente de RRHH/Admin.'
        );

        // NO enviamos email aquí, solo cuando Admin apruebe finalmente

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

        if (request.status !== 'PENDING_MANAGER') {
            return res.status(409).json({ error: 'La solicitud no esta pendiente de manager' });
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

        // 🔔 ENVIAR EMAIL AL EMPLEADO
        const employee = await prisma.user.findUnique({
            where: { id: request.userId },
            select: { email: true, name: true }
        });

        const getTypeLabel = (t, st) => {
            switch (t) {
                case 'VACATION': return 'Vacaciones';
                case 'SICK_LEAVE': return 'Horas médicas';
                case 'MEDICAL_LEAVE': return 'Baja médica';
                case 'PERSONAL': return 'Asuntos Propios';
                case 'OVERTIME': return 'Horas Exceso';
                case 'OTHER': return st || 'Otros Permisos';
                default: return t;
            }
        };

        const emailVariables = {
            employeeName: employee.name,
            requestType: getTypeLabel(request.type, request.subtype),
            startDate: new Date(request.startDate).toLocaleDateString('es-ES'),
            endDate: new Date(request.endDate).toLocaleDateString('es-ES'),
            reason: 'Tu manager ha rechazado la solicitud'
        };

        await sendTemplateEmail(employee.email, 'REQUEST_REJECTED', emailVariables);

        res.json(updated);
    } catch (error) {
        console.error("Manager reject error:", error);
        res.status(500).json({ error: 'Failed to reject request' });
    }
};

/**
 * DELETE /api/vacations/:id
 * The owner cancels a request that has not been decided yet.
 */
exports.cancelVacation = async (req, res) => {
    try {
        const request = await prisma.vacationRequest.findUnique({ where: { id: req.params.id } });
        if (!request || request.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }
        if (!['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'].includes(request.status)) {
            return res.status(409).json({ error: 'Solo se pueden cancelar solicitudes pendientes' });
        }
        await prisma.vacationRequest.delete({ where: { id: request.id } });
        res.json({ ok: true });
    } catch (error) {
        console.error('Cancel vacation error:', error);
        res.status(500).json({ error: 'No se pudo cancelar la solicitud' });
    }
};

/**
 * GET /api/vacations/overlap?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Colleagues of the caller's department who are absent (approved or pending) in that range,
 * so the employee can see clashes before asking. Only names are returned, never the leave type.
 */
exports.getOverlap = async (req, res) => {
    try {
        const start = new Date(String(req.query.startDate || ''));
        const end = new Date(String(req.query.endDate || ''));
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return res.status(400).json({ error: 'Fechas no válidas' });
        }
        if ((end - start) / 86400000 > 366) return res.status(400).json({ error: 'Rango demasiado largo' });

        const me = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { department: true } });
        if (!me?.department) return res.json({ count: 0, people: [] });

        const overlapping = await prisma.vacationRequest.findMany({
            where: {
                userId: { not: req.user.userId },
                status: { in: ['APPROVED', 'PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'] },
                startDate: { lte: end },
                endDate: { gte: start },
                user: { department: me.department, active: true },
            },
            select: { status: true, user: { select: { id: true, name: true } } },
        });
        const byUser = new Map();
        for (const v of overlapping) {
            const prev = byUser.get(v.user.id);
            // An approved absence wins over a pending one for the same person
            if (!prev || v.status === 'APPROVED') byUser.set(v.user.id, { name: v.user.name, approved: v.status === 'APPROVED' });
        }
        const people = [...byUser.values()];
        res.json({ count: people.length, people });
    } catch (error) {
        console.error('Vacation overlap error:', error);
        res.status(500).json({ error: 'No se pudo comprobar el calendario del equipo' });
    }
};
