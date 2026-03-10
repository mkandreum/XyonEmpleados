const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/department-schedules/:department
 * Obtener todos los turnos (shifts) de un departamento
 */
exports.getSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const shifts = await prisma.departmentShift.findMany({
            where: { department },
            orderBy: { name: 'asc' }
        });

        if (!shifts || shifts.length === 0) {
            // Retornar turno por defecto si no existe
            return res.json([{
                id: 'default',
                department,
                name: 'General',
                activeDays: 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES',
                horaEntrada: '09:00',
                horaSalida: '18:00',
                toleranciaMinutos: 10,
                horaEntradaTarde: null,
                horaSalidaMañana: null,
                flexibleSchedule: false,
                scheduleOverrides: null
            }]);
        }

        res.json(shifts);
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

/**
 * POST /api/department-schedules
 * Crear o actualizar un turno de departamento (solo admins)
 */
exports.upsertSchedule = async (req, res) => {
    try {
        const {
            department,
            name,
            activeDays,
            horaEntrada,
            horaSalida,
            horaEntradaTarde,
            horaSalidaMañana,
            toleranciaMinutos,
            flexibleSchedule,
            scheduleOverrides
        } = req.body;

        const shiftName = name || "General";

        if (!department || !horaEntrada || !horaSalida) {
            return res.status(400).json({
                error: 'Departamento, hora de entrada y hora de salida son obligatorios'
            });
        }

        // Validar formato de horas (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(horaEntrada) || !timeRegex.test(horaSalida)) {
            return res.status(400).json({
                error: 'Formato de hora inválido. Use HH:mm'
            });
        }

        if (horaEntradaTarde && !timeRegex.test(horaEntradaTarde)) {
            return res.status(400).json({
                error: 'Formato de hora de entrada tarde inválido. Use HH:mm'
            });
        }

        if (horaSalidaMañana && !timeRegex.test(horaSalidaMañana)) {
            return res.status(400).json({
                error: 'Formato de hora de salida mañana inválido. Use HH:mm'
            });
        }

        // Validar que activeDays sea comma-separated
        const validDays = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
        const daysToCheck = (activeDays || 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES')
            .split(',')
            .map(d => d.trim())
            .filter(d => d);
        
        for (const day of daysToCheck) {
            if (!validDays.includes(day.toUpperCase())) {
                return res.status(400).json({
                    error: `Día inválido: ${day}. Valores válidos: ${validDays.join(', ')}`
                });
            }
        }

        const data = {
            horaEntrada,
            horaSalida,
            activeDays: (activeDays || 'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES').toUpperCase(),
            horaEntradaTarde: horaEntradaTarde || null,
            horaSalidaMañana: horaSalidaMañana || null,
            toleranciaMinutos: toleranciaMinutos || 10,
            flexibleSchedule: flexibleSchedule || false,
            scheduleOverrides: scheduleOverrides || null
        };

        const shift = await prisma.departmentShift.upsert({
            where: { department_name: { department, name: shiftName } },
            update: data,
            create: {
                department,
                name: shiftName,
                ...data
            }
        });

        res.json(shift);
    } catch (error) {
        console.error('Error upserting schedule:', error);
        res.status(500).json({ error: 'Error al guardar horario' });
    }
};

/**
 * GET /api/department-schedules
 * Obtener todos los turnos de todos los departamentos (solo admins)
 */
exports.getAllSchedules = async (req, res) => {
    try {
        const shifts = await prisma.departmentShift.findMany({
            orderBy: [{ department: 'asc' }, { name: 'asc' }]
        });

        res.json(shifts);
    } catch (error) {
        console.error('Error getting all schedules:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

/**
 * DELETE /api/department-schedules/:id
 * Eliminar un turno específico (solo admins)
 */
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const shift = await prisma.departmentShift.findUnique({
            where: { id }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        await prisma.departmentShift.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Turno eliminado' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
};

/**
 * GET /api/department-schedules/:department/resolved
 * Obtener información completa del turno con overrides resueltos
 */
exports.getResolvedSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const shifts = await prisma.departmentShift.findMany({
            where: { department }
        });

        if (!shifts || shifts.length === 0) {
            return res.json({
                department,
                shifts: []
            });
        }

        res.json({
            department,
            shifts
        });
    } catch (error) {
        console.error('Error getting resolved schedule:', error);
        res.status(500).json({ error: 'Error al obtener horarios resueltos' });
    }
};

