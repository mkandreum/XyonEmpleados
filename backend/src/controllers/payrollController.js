const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            where: { userId: req.user.userId },
            orderBy: [
                { year: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(payrolls);
    } catch (error) {
        console.error('Get payrolls error:', error);
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
};

/**
 * PUT /api/payrolls/:id/signed
 * Upload signed payroll PDF (employee uploads the signed copy)
 * The file should already be uploaded via /api/upload/payroll
 * This endpoint just sets the signedPdfUrl on the payroll record.
 */
exports.uploadSignedPayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const { signedPdfUrl } = req.body;
        const userId = req.user.userId;

        if (!signedPdfUrl) {
            return res.status(400).json({ error: 'signedPdfUrl es requerido' });
        }

        // Verify the payroll belongs to this user
        const payroll = await prisma.payroll.findFirst({
            where: { id, userId }
        });

        if (!payroll) {
            return res.status(404).json({ error: 'Nómina no encontrada' });
        }

        const updated = await prisma.payroll.update({
            where: { id },
            data: { signedPdfUrl }
        });

        res.json(updated);
    } catch (error) {
        console.error('Upload signed payroll error:', error);
        res.status(500).json({ error: 'Error al subir nómina firmada' });
    }
};

/**
 * GET /api/payrolls/:id/download
 * Download the payroll PDF as attachment (triggers download instead of opening)
 */
exports.downloadPayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const payroll = await prisma.payroll.findFirst({
            where: userRole === 'ADMIN' ? { id } : { id, userId },
            include: { user: { select: { name: true } } }
        });

        if (!payroll) {
            return res.status(404).json({ error: 'Nómina no encontrada' });
        }

        // Return the URL info so frontend can trigger the download
        res.json({
            pdfUrl: payroll.pdfUrl,
            filename: `nomina-${payroll.user.name.replace(/\s+/g, '_')}-${payroll.month}-${payroll.year}.pdf`
        });
    } catch (error) {
        console.error('Download payroll error:', error);
        res.status(500).json({ error: 'Error al descargar nómina' });
    }
};
