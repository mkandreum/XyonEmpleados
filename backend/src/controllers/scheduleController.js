const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getScheduleForDay, getAllDaySchedules, DAY_FIELD_MAP } = require('../services/smartScheduleService');

/**
 * GET /api/department-schedules/:department
 * Obtener horario de un departamento (incluye horarios por día resueltos)
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
                flexibleSchedule: false,
                scheduleLunes: null,
                scheduleMartes: null,
                scheduleMiercoles: null,
                scheduleJueves: null,
                scheduleViernes: null,
                scheduleSabado: null,
                scheduleDomingo: null
            });
        }

            res.json([schedule]);
    } catch (error) {
        console.error('Error getting schedule:', error);
        res.status(500).json({ error: 'Error al obtener horario' });
    }
};

/**
 * POST /api/department-schedules
 * Crear o actualizar horario de departamento (solo admins)
 * Now supports per-day schedule overrides
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
            flexibleSchedule,
            // Per-day overrides
            scheduleLunes,
            scheduleMartes,
            scheduleMiercoles,
            scheduleJueves,
            scheduleViernes,
            scheduleSabado,
            scheduleDomingo
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

        // Validate per-day schedules
        const daySchedules = { scheduleLunes, scheduleMartes, scheduleMiercoles, scheduleJueves, scheduleViernes, scheduleSabado, scheduleDomingo };
        for (const [dayName, daySchedule] of Object.entries(daySchedules)) {
            if (daySchedule && typeof daySchedule === 'object' && !daySchedule.dayOff) {
                if (daySchedule.horaEntrada && !timeRegex.test(daySchedule.horaEntrada)) {
                    return res.status(400).json({
                        error: `Formato de hora inválido en ${dayName}. Use HH:mm`
                    });
                }
                if (daySchedule.horaSalida && !timeRegex.test(daySchedule.horaSalida)) {
                    return res.status(400).json({
                        error: `Formato de hora inválido en ${dayName}. Use HH:mm`
                    });
                }
                if (daySchedule.horaEntradaTarde && !timeRegex.test(daySchedule.horaEntradaTarde)) {
                    return res.status(400).json({
                        error: `Formato de hora entrada tarde inválido en ${dayName}. Use HH:mm`
                    });
                }
                if (daySchedule.horaSalidaMañana && !timeRegex.test(daySchedule.horaSalidaMañana)) {
                    return res.status(400).json({
                        error: `Formato de hora salida mañana inválido en ${dayName}. Use HH:mm`
                    });
                }
            }
        }

        const data = {
            horaEntrada,
            horaSalida,
            horaEntradaTarde: horaEntradaTarde || null,
            horaSalidaMañana: horaSalidaMañana || null,
            toleranciaMinutos: toleranciaMinutos || 10,
            flexibleSchedule: flexibleSchedule || false,
            // Per-day overrides (store as JSON, null if not provided)
            scheduleLunes: scheduleLunes || null,
            scheduleMartes: scheduleMartes || null,
            scheduleMiercoles: scheduleMiercoles || null,
            scheduleJueves: scheduleJueves || null,
            scheduleViernes: scheduleViernes || null,
            scheduleSabado: scheduleSabado || null,
            scheduleDomingo: scheduleDomingo || null
        };

        const schedule = await prisma.departmentSchedule.upsert({
            where: { department },
            update: data,
            create: {
                department,
                ...data
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

            const { name } = req.params;
            await prisma.departmentSchedule.delete({
                where: { department_name: { department, name } }
            });

        res.json({ success: true, message: 'Horario eliminado' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
};

/**
 * GET /api/department-schedules/:department/resolved
 * Obtener horarios resueltos por día de la semana (vista admin)
 */
exports.getResolvedSchedule = async (req, res) => {
    try {
        const { department } = req.params;

        const schedule = await prisma.departmentSchedule.findUnique({
            where: { department }
        });

        if (!schedule) {
            return res.json({
                department,
                default: {
                    horaEntrada: '09:00',
                    horaSalida: '18:00',
                    toleranciaMinutos: 10,
                    flexibleSchedule: false
                },
                days: {}
            });
        }

        const resolvedDays = getAllDaySchedules(schedule);

        res.json({
            department,
            schedule,
            days: resolvedDays
        });
    } catch (error) {
        console.error('Error getting resolved schedule:', error);
        res.status(500).json({ error: 'Error al obtener horarios resueltos' });
    }
};
