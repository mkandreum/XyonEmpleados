const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');

const MIGRATIONS_DIR = path.join(__dirname, '../../prisma/migrations');
const BACKUPS_DIR = process.env.MIGRATION_BACKUPS_DIR || path.join(__dirname, '../../uploads/backups');

/**
 * GET /api/admin/system/migrations
 * Read-only view of the automatic migration state, for admins without direct database access.
 * Only names, dates and sizes: backups are never downloadable through the API.
 */
exports.getMigrationStatus = async (req, res) => {
    try {
        let applied = [];
        try {
            applied = await prisma.$queryRawUnsafe('SELECT "name", "executedAt" FROM "_AppMigrations" ORDER BY "executedAt" DESC');
        } catch {
            applied = []; // table not created yet
        }
        const appliedNames = new Set(applied.map(a => a.name));
        const files = fs.existsSync(MIGRATIONS_DIR) ? fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort() : [];
        const backups = fs.existsSync(BACKUPS_DIR)
            ? fs.readdirSync(BACKUPS_DIR)
                .filter(f => f.endsWith('.dump'))
                .map(f => {
                    const st = fs.statSync(path.join(BACKUPS_DIR, f));
                    return { name: f, sizeBytes: st.size, createdAt: st.mtime };
                })
                .sort((a, b) => b.createdAt - a.createdAt)
            : [];

        res.json({
            applied,
            pending: files.filter(f => !appliedNames.has(f)),
            backups,
        });
    } catch (error) {
        console.error('Migration status error:', error);
        res.status(500).json({ error: 'No se pudo leer el estado de las migraciones' });
    }
};
