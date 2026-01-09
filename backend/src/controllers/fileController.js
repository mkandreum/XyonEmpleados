const path = require('path');
const fs = require('fs');

const uploadsBase = path.join(__dirname, '../../uploads');
const privateDir = path.join(uploadsBase, 'private');

exports.getFile = async (req, res) => {
    try {
        const { type, filename } = req.params;
        const user = req.user; // Set by authenticateToken middleware

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate type
        const allowedTypes = ['payrolls', 'justifications'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }

        const filePath = path.join(privateDir, type, filename);

        // Security check: Prevent directory traversal
        if (!filePath.startsWith(privateDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // AUTHORIZATION LOGIC
        // 1. Admin can access everything
        if (user.role === 'ADMIN') {
            return res.sendFile(filePath);
        }

        // 2. Determine file ownership (Heuristic needed or DB lookup)
        // Since we don't store file ownership in a separate table for generic uploads 
        // (except usually linked in Prisma models), we might need to rely on the requesting context 
        // OR enforce that filenames contain user IDs or rely on the frontend sending the token correctly 
        // and the fact that users only see links to their own data in the UI.

        // HOWEVER, "Security by UI hiding" is not enough.

        // Strategy:
        // - For Payrols: They are in `Payroll` table. We should look up if a payroll with this pdfUrl exists and belongs to user.
        // - For Justifications: In `VacationRequest` or `LateArrivalNotification`.

        // To implement distinct strict ownership checks:
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        let hasAccess = false;

        const relativeUrl = `/api/files/${type}/${filename}`;

        if (type === 'payrolls') {
            const payroll = await prisma.payroll.findFirst({
                where: { pdfUrl: relativeUrl }
            });

            // If checking Manager logic for team payrolls (if applicable):
            // if (user.role === 'MANAGER' && payroll) { ... check if payroll.userId is in team ... }

            if (payroll && payroll.userId === user.id) {
                hasAccess = true;
            }
            if (user.role === 'MANAGER') {
                // Allow managers? Usually managers don't see payrolls of employees. Let's assume NO.
            }
        } else if (type === 'justifications') {
            // Check Vacation Requests
            const vacation = await prisma.vacationRequest.findFirst({
                where: { justificationUrl: relativeUrl }
            });
            if (vacation) {
                if (vacation.userId === user.id) hasAccess = true;

                // Managers can view justifications of their team?
                // Complex logic: Check if user.department matches manager AND role is manager
                if (user.role === 'MANAGER') {
                    const requestUser = await prisma.user.findUnique({ where: { id: vacation.userId } });
                    if (requestUser && requestUser.department === user.department) {
                        hasAccess = true;
                    }
                }
            }

            // Check Late Arrivals
            if (!hasAccess) {
                const late = await prisma.lateArrivalNotification.findFirst({
                    where: { justificacionTexto: { contains: filename } } // Logic mismatch: url vs text. 
                    // We need to verify how justificacion is stored. Currently likely just text, or url?
                    // In schema check: LateArrivalNotification has `justificacionTexto`, no explicit URL field for file.
                    // It might be embedded or not supported yet. Assuming Vacations mainly.
                });
                // If LateArrivals don't use file uploads yet, verify `types.ts` / schema.
                // Schema says `justificacionTexto` String?. If we uploaded a file, where is the URL?
                // If not implemented, skip.
            }
        }

        if (hasAccess) {
            return res.sendFile(filePath);
        } else {
            console.warn(`⛔ Access denied for user ${user.id} to file ${filename}`);
            return res.status(403).json({ error: 'Access denied to this file' });
        }

    } catch (error) {
        console.error('File retrieval error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
