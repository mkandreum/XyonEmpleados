const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get department benefits
exports.getDepartmentBenefits = async (req, res) => {
    try {
        const benefits = await prisma.departmentBenefits.findMany();
        res.json(benefits);
    } catch (error) {
        console.error('Get benefits error:', error);
        res.status(500).json({ error: 'Failed to fetch benefits' });
    }
};

// Get benefits for specific department
exports.getBenefitsByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        const benefits = await prisma.departmentBenefits.findUnique({
            where: { department }
        });

        if (!benefits) {
            // Return default benefits
            return res.json({
                department,
                vacationDays: 22,
                overtimeHoursBank: 40,
                sickLeaveHours: 15,
                paidAbsenceHours: 20
            });
        }

        res.json(benefits);
    } catch (error) {
        console.error('Get department benefits error:', error);
        res.status(500).json({ error: 'Failed to fetch department benefits' });
    }
};

// Create or update department benefits
exports.upsertDepartmentBenefits = async (req, res) => {
    try {
        const { department, vacationDays, overtimeHoursBank, sickLeaveHours, paidAbsenceHours } = req.body;

        const benefits = await prisma.departmentBenefits.upsert({
            where: { department },
            update: { vacationDays, overtimeHoursBank, sickLeaveHours, paidAbsenceHours },
            create: { department, vacationDays, overtimeHoursBank, sickLeaveHours, paidAbsenceHours }
        });

        res.json(benefits);
    } catch (error) {
        console.error('Upsert benefits error:', error);
        res.status(500).json({ error: 'Failed to save benefits' });
    }
};

// Get user benefits balance
// Get user benefits balance
exports.getUserBenefitsBalance = async (req, res) => {
    try {
        const userId = req.user.userId;
        const currentYear = new Date().getFullYear();

        let balance = await prisma.userBenefitsBalance.findUnique({
            where: { userId }
        });

        // Create if doesn't exist or year is old
        if (!balance || balance.year !== currentYear) {
            balance = await prisma.userBenefitsBalance.upsert({
                where: { userId },
                update: {
                    vacationDaysUsed: 0,
                    overtimeHoursUsed: 0,
                    sickLeaveHoursUsed: 0,
                    paidAbsenceHoursUsed: 0,
                    year: currentYear
                },
                create: {
                    userId,
                    vacationDaysUsed: 0,
                    overtimeHoursUsed: 0,
                    sickLeaveHoursUsed: 0,
                    paidAbsenceHoursUsed: 0,
                    year: currentYear
                }
            });
        }

        // Get user department benefits
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const deptBenefits = await prisma.departmentBenefits.findUnique({
            where: { department: user.department }
        });

        // Calculate remaining
        const defaultBenefits = {
            vacationDays: 22,
            overtimeHoursBank: 40,
            sickLeaveHours: 15,
            paidAbsenceHours: 20
        };

        const deptBenefitsData = deptBenefits || defaultBenefits;

        // --- Proration Logic ---
        let vacationEntitlement = deptBenefitsData.vacationDays;

        if (user.joinDate) {
            const joinDate = new Date(user.joinDate);
            const joinYear = joinDate.getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31);

            if (joinYear === currentYear) {
                // Cálculo de meses trabajados (más preciso que días)
                const today = new Date();
                const endDate = today > endOfYear ? endOfYear : today;
                
                const monthsWorked = (endDate.getFullYear() - joinDate.getFullYear()) * 12 
                                    + (endDate.getMonth() - joinDate.getMonth());
                
                // Días trabajados en el mes parcial actual
                const daysInCurrentMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
                const daysWorkedInPartialMonth = Math.max(0, endDate.getDate() - joinDate.getDate() + 1);
                const partialMonthRatio = daysWorkedInPartialMonth / daysInCurrentMonth;
                
                const totalMonthsEquivalent = monthsWorked + partialMonthRatio;
                
                // Mínimo legal España: 2.5 días por mes
                vacationEntitlement = Math.max(
                    1, // Al menos 1 día si trabajó cualquier tiempo
                    Math.round((deptBenefitsData.vacationDays / 12) * totalMonthsEquivalent)
                );
            }
        }

        const benefits = {
            ...deptBenefitsData,
            vacationDays: vacationEntitlement, // Override with prorated value
            originalVacationDays: deptBenefitsData.vacationDays // Keep original for reference if needed
        };

        // ✅ SOLO LEER - No recalcular ni actualizar
        // El balance se actualiza cuando se aprueba una solicitud (en updateVacationStatus)
        res.json({
            ...balance,
            vacationDaysRemaining: Math.max(0, vacationEntitlement - balance.vacationDaysUsed),
            overtimeHoursRemaining: Math.max(0, benefits.overtimeHoursBank - balance.overtimeHoursUsed),
            sickLeaveHoursRemaining: Math.max(0, benefits.sickLeaveHours - balance.sickLeaveHoursUsed),
            paidAbsenceHoursRemaining: Math.max(0, benefits.paidAbsenceHours - balance.paidAbsenceHoursUsed),
            totalBenefits: benefits
        });
    } catch (error) {
        console.error('Get user balance error:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
};

// Internal logic to update balance
const updateUserBalanceLogic = async (userId, type, days, hours, subtype = null) => {
    const currentYear = new Date().getFullYear();

    const balance = await prisma.userBenefitsBalance.findUnique({
        where: { userId }
    });

    if (!balance || balance.year !== currentYear) {
        throw new Error('Balance not found for current year');
    }

    const updateData = {};

    // Priority to hours if provided
    if (hours) {
        // Both SICK_LEAVE (Horas médicas) and PERSONAL (Asuntos Propios) consume paidAbsenceHours
        if (type === 'PERSONAL') {
            updateData.paidAbsenceHoursUsed = balance.paidAbsenceHoursUsed + hours;
        } else if (type === 'SICK_LEAVE') {
            // "Bajas Médicas" / "Horas Médicas" now tracks HOURS in the sickLeaveHoursUsed field
            updateData.sickLeaveHoursUsed = balance.sickLeaveHoursUsed + hours;
        } else if (type === 'OVERTIME') {
            updateData.overtimeHoursUsed = balance.overtimeHoursUsed + hours;
        } else if (type === 'OTHER') {
            if (subtype && subtype.includes('Horas Consulta')) {
                updateData.paidAbsenceHoursUsed = balance.paidAbsenceHoursUsed + hours;
            } else if (subtype && subtype.includes('Exceso')) {
                updateData.overtimeHoursUsed = balance.overtimeHoursUsed + hours;
            }
        }
    } else {
        // Legacy/Days logic
        if (type === 'VACATION') {
            updateData.vacationDaysUsed = balance.vacationDaysUsed + days;
        } else if (type === 'SICK_LEAVE') {
            updateData.sickLeaveHoursUsed = balance.sickLeaveHoursUsed + days;
        } else if (type === 'PERSONAL') {
            updateData.paidAbsenceHoursUsed = balance.paidAbsenceHoursUsed + (days * 8); // Convert days to hours
        } else if (type === 'OTHER') {
            // If days are used for "Otros Permisos", we generally don't deduct unless specified.
            // Matrimonio, Fallecimiento etc are paid leaves (No deduction).
        }
    }

    return await prisma.userBenefitsBalance.update({
        where: { userId },
        data: updateData
    });
};

// Update user balance (called when vacation is approved)
exports.updateUserBalance = async (req, res) => {
    try {
        const { userId, type, days, hours, subtype } = req.body;
        const updated = await updateUserBalanceLogic(userId, type, days, hours, subtype);
        res.json(updated);
    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: error.message || 'Failed to update balance' });
    }
};

exports.updateUserBalanceLogic = updateUserBalanceLogic;
