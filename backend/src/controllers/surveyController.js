const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get active survey
exports.getActiveSurvey = async (req, res) => {
    try {
        const now = new Date();
        const survey = await prisma.survey.findFirst({
            where: {
                isActive: true,
                startDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(survey);
    } catch (error) {
        console.error('Get active survey error:', error);
        res.status(500).json({ error: 'Failed to fetch survey' });
    }
};

// Admin: Get all surveys
exports.getAllSurveys = async (req, res) => {
    try {
        const surveys = await prisma.survey.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(surveys);
    } catch (error) {
        console.error('Get surveys error:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
};

// Admin: Create survey
exports.createSurvey = async (req, res) => {
    try {
        const { title, description, url, isActive, startDate, endDate } = req.body;

        const survey = await prisma.survey.create({
            data: {
                title,
                description,
                url,
                isActive: isActive !== undefined ? isActive : true,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null
            }
        });

        res.json(survey);
    } catch (error) {
        console.error('Create survey error:', error);
        res.status(500).json({ error: 'Failed to create survey' });
    }
};

// Admin: Update survey
exports.updateSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, url, isActive, startDate, endDate } = req.body;

        const survey = await prisma.survey.update({
            where: { id },
            data: {
                title,
                description,
                url,
                isActive,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : null
            }
        });

        res.json(survey);
    } catch (error) {
        console.error('Update survey error:', error);
        res.status(500).json({ error: 'Failed to update survey' });
    }
};

// Admin: Delete survey
exports.deleteSurvey = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.survey.delete({ where: { id } });
        res.json({ message: 'Survey deleted successfully' });
    } catch (error) {
        console.error('Delete survey error:', error);
        res.status(500).json({ error: 'Failed to delete survey' });
    }
};
