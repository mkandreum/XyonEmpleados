const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/department-schedules/:department
 * Obtener horario de un departamento
 */
exports.getSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const schedule = await prisma.departmentSchedule.findUnique({
            where: { department }
        });

        if (!schedule) {
            // Retornar horario por defecto si no existe
            return res.json({
                department,
                horaEntrada: '09:00',
                horaSalida: '18:00',
                toleranciaMinutos: 10,
                horaEntradaTarde: null,
                horaSalidaMañana: null,
                flexibleSchedule: false
            });
        }

        res.json(schedule);
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Error al obtener horario' });
    }
};

/**
 * POST /api/department-schedules
 * Crear o actualizar horario de departamento (solo admins)
 */
exports.upsertSchedule = async (req, res) => {
    try {
        const {
            department,
            horaEntrada,
            horaSalida,
            horaEntradaTarde,
            horaSalidaMañana,
            toleranciaMinutos,
            flexibleSchedule
        } = req.body;

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

        const schedule = await prisma.departmentSchedule.upsert({
            where: { department },
            update: {
                horaEntrada,
                horaSalida,
                horaEntradaTarde: horaEntradaTarde || null,
                horaSalidaMañana: horaSalidaMañana || null,
                toleranciaMinutos: toleranciaMinutos || 10,
                flexibleSchedule: flexibleSchedule || false
            },
            create: {
                department,
                horaEntrada,
                horaSalida,
                horaEntradaTarde: horaEntradaTarde || null,
                horaSalidaMañana: horaSalidaMañana || null,
                toleranciaMinutos: toleranciaMinutos || 10,
                flexibleSchedule: flexibleSchedule || false
            }
        });

        res.json(schedule);
    } catch (error) {
        console.error('Error upserting schedule:', error);
        res.status(500).json({ error: 'Error al guardar horario' });
    }
};

/**
 * GET /api/department-schedules
 * Obtener todos los horarios (solo admins)
 */
exports.getAllSchedules = async (req, res) => {
    try {
        const schedules = await prisma.departmentSchedule.findMany({
            orderBy: { department: 'asc' }
        });

        res.json(schedules);
    } catch (error) {
        console.error('Error getting all schedules:', error);
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
};

/**
 * DELETE /api/department-schedules/:department
 * Eliminar horario de un departamento (solo admins)
 */
exports.deleteSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const schedule = await prisma.departmentSchedule.findUnique({
            where: { department }
        });

        if (!schedule) {
            return res.status(404).json({ error: 'Horario no encontrado' });
        }

        await prisma.departmentSchedule.delete({
            where: { department }
        });

        res.json({ success: true, message: 'Horario eliminado' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
};
