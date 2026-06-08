const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/dashboard-layouts — list all layouts (admin)
const getLayouts = async (req, res) => {
    try {
        const layouts = await prisma.dashboardLayout.findMany({
            include: { widgets: { orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(layouts);
    } catch (e) {
        console.error('getLayouts error:', e);
        res.status(500).json({ error: 'Error al obtener layouts' });
    }
};

// POST /api/dashboard-layouts — create layout (admin)
const createLayout = async (req, res) => {
    try {
        const { name, description, startDate, endDate, isActive } = req.body;
        if (isActive) {
            await prisma.dashboardLayout.updateMany({ data: { isActive: false } });
        }
        const layout = await prisma.dashboardLayout.create({
            data: {
                name,
                description: description || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: !!isActive
            },
            include: { widgets: true }
        });
        res.json(layout);
    } catch (e) {
        console.error('createLayout error:', e);
        res.status(500).json({ error: 'Error al crear layout' });
    }
};

// PUT /api/dashboard-layouts/:id — update layout (admin)
const updateLayout = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, isActive } = req.body;
        if (isActive) {
            await prisma.dashboardLayout.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
        }
        const layout = await prisma.dashboardLayout.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(isActive !== undefined && { isActive })
            },
            include: { widgets: { orderBy: { order: 'asc' } } }
        });
        res.json(layout);
    } catch (e) {
        console.error('updateLayout error:', e);
        res.status(500).json({ error: 'Error al actualizar layout' });
    }
};

// DELETE /api/dashboard-layouts/:id — delete layout (admin)
const deleteLayout = async (req, res) => {
    try {
        await prisma.dashboardLayout.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('deleteLayout error:', e);
        res.status(500).json({ error: 'Error al eliminar layout' });
    }
};

// POST /api/dashboard-layouts/:id/widgets — add widget to layout (admin)
const addWidget = async (req, res) => {
    try {
        const { id: layoutId } = req.params;
        const { type, label, isActive, scope, department, config } = req.body;
        const maxOrder = await prisma.dashboardWidget.aggregate({
            where: { layoutId },
            _max: { order: true }
        });
        const widget = await prisma.dashboardWidget.create({
            data: {
                layoutId,
                type,
                label,
                isActive: isActive !== false,
                scope: scope || 'ALL',
                department: department || null,
                config: config || null,
                order: (maxOrder._max.order ?? -1) + 1
            }
        });
        res.json(widget);
    } catch (e) {
        console.error('addWidget error:', e);
        res.status(500).json({ error: 'Error al añadir widget' });
    }
};

// PUT /api/dashboard-layouts/widgets/:widgetId — update single widget (admin)
const updateWidget = async (req, res) => {
    try {
        const { widgetId } = req.params;
        const { type, label, isActive, scope, department, config, order } = req.body;
        const widget = await prisma.dashboardWidget.update({
            where: { id: widgetId },
            data: {
                ...(type !== undefined && { type }),
                ...(label !== undefined && { label }),
                ...(isActive !== undefined && { isActive }),
                ...(scope !== undefined && { scope }),
                ...(department !== undefined && { department: department || null }),
                ...(config !== undefined && { config }),
                ...(order !== undefined && { order })
            }
        });
        res.json(widget);
    } catch (e) {
        console.error('updateWidget error:', e);
        res.status(500).json({ error: 'Error al actualizar widget' });
    }
};

// PUT /api/dashboard-layouts/:id/reorder — bulk reorder (admin)
const reorderWidgets = async (req, res) => {
    try {
        const { widgetOrders } = req.body; // [{ id, order }, ...]
        await Promise.all(
            widgetOrders.map(({ id, order }) =>
                prisma.dashboardWidget.update({ where: { id }, data: { order } })
            )
        );
        res.json({ success: true });
    } catch (e) {
        console.error('reorderWidgets error:', e);
        res.status(500).json({ error: 'Error al reordenar widgets' });
    }
};

// DELETE /api/dashboard-layouts/widgets/:widgetId — delete widget (admin)
const deleteWidget = async (req, res) => {
    try {
        await prisma.dashboardWidget.delete({ where: { id: req.params.widgetId } });
        res.json({ success: true });
    } catch (e) {
        console.error('deleteWidget error:', e);
        res.status(500).json({ error: 'Error al eliminar widget' });
    }
};

// GET /api/dashboard-layouts/active — get active layout for current user role
const getActiveLayout = async (req, res) => {
    try {
        const now = new Date();
        const role = req.user?.role || 'EMPLOYEE';

        const layout = await prisma.dashboardLayout.findFirst({
            where: {
                isActive: true,
                OR: [
                    { startDate: null, endDate: null },
                    { startDate: { lte: now }, endDate: { gte: now } },
                    { startDate: { lte: now }, endDate: null },
                    { startDate: null, endDate: { gte: now } }
                ]
            },
            include: {
                widgets: {
                    where: {
                        isActive: true,
                        OR: [
                            { scope: 'ALL' },
                            { scope: role }
                        ]
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });

        res.json(layout || null);
    } catch (e) {
        console.error('getActiveLayout error:', e);
        res.status(500).json({ error: 'Error al obtener layout activo' });
    }
};

module.exports = {
    getLayouts,
    createLayout,
    updateLayout,
    deleteLayout,
    addWidget,
    updateWidget,
    reorderWidgets,
    deleteWidget,
    getActiveLayout
};
