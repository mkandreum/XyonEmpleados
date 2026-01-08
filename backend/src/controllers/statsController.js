const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get admin statistics
exports.getAdminStats = async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Total employees
        const totalEmployees = await prisma.user.count({
            where: { role: { not: 'ADMIN' } }
        });

        // Pending vacation requests
        const pendingRequests = await prisma.vacationRequest.count({
            where: { status: 'PENDING' }
        });

        // Approved vacations this month
        const approvedThisMonth = await prisma.vacationRequest.count({
            where: {
                status: 'APPROVED',
                createdAt: { gte: firstDayOfMonth }
            }
        });

        // Payrolls processed this month
        const payrollsProcessed = await prisma.payroll.count({
            where: {
                year: now.getFullYear(),
                month: now.toLocaleDateString('es-ES', { month: 'long' })
            }
        });

        // Requests by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const requestsByMonth = await prisma.$queryRaw`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
                COUNT(*)::int as count
            FROM "VacationRequest"
            WHERE "createdAt" >= ${sixMonthsAgo}
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY DATE_TRUNC('month', "createdAt") ASC
        `;

        // Employees by department
        const employeesByDepartment = await prisma.user.groupBy({
            by: ['department'],
            where: { role: { not: 'ADMIN' } },
            _count: { department: true }
        });

        const departmentData = employeesByDepartment.map(d => ({
            department: d.department,
            count: d._count.department
        }));

        res.json({
            totalEmployees,
            pendingRequests,
            approvedThisMonth,
            payrollsProcessed,
            requestsByMonth,
            employeesByDepartment: departmentData
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};
