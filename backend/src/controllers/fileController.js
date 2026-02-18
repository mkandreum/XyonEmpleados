const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist (using absolute path relative to this controller file)
const uploadsBase = path.join(__dirname, '../../uploads');
const privateDir = path.join(uploadsBase, 'private');
// Legacy directory (before private/ structure was introduced)
const legacyDir = uploadsBase;

// Helper: find file in private or legacy directory
function findFilePath(type, filename) {
    const privatePath = path.join(privateDir, type, filename);
    if (fs.existsSync(privatePath)) return privatePath;

    const legacyPath = path.join(legacyDir, type, filename);
    if (fs.existsSync(legacyPath)) return legacyPath;

    return null;
}

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

        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const filePath = findFilePath(type, filename);

        if (!filePath) {
            console.warn(`File not found: ${type}/${filename} (checked private/ and legacy/)`);
            return res.status(404).json({ error: 'File not found' });
        }

        // AUTHORIZATION LOGIC
        // 1. Admin can access everything
        if (user.role === 'ADMIN') {
            return res.sendFile(filePath);
        }

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        let hasAccess = false;

        // Look up ownership - check BOTH new and legacy URL formats
        const newUrl = `/api/files/${type}/${filename}`;
        const legacyUrl = `/uploads/${type}/${filename}`;
        const legacyPrivateUrl = `/uploads/private/${type}/${filename}`;

        if (type === 'payrolls') {
            const payroll = await prisma.payroll.findFirst({
                where: {
                    OR: [
                        { pdfUrl: newUrl },
                        { pdfUrl: legacyUrl },
                        { pdfUrl: legacyPrivateUrl },
                        { pdfUrl: { contains: filename } }
                    ]
                }
            });

            if (payroll && payroll.userId === user.id) {
                hasAccess = true;
            }
        } else if (type === 'justifications') {
            const vacation = await prisma.vacationRequest.findFirst({
                where: {
                    OR: [
                        { justificationUrl: newUrl },
                        { justificationUrl: legacyUrl },
                        { justificationUrl: legacyPrivateUrl },
                        { justificationUrl: { contains: filename } }
                    ]
                }
            });
            if (vacation) {
                if (vacation.userId === user.id) hasAccess = true;

                // Managers can view justifications of their team
                if (user.role === 'MANAGER') {
                    const requestUser = await prisma.user.findUnique({ where: { id: vacation.userId } });
                    if (requestUser && requestUser.department === user.department) {
                        hasAccess = true;
                    }
                }
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
