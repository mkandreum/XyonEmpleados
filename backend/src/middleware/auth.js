const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}

const prisma = require('../lib/prisma');

if (JWT_SECRET.length < 32) {
    console.warn('[SECURITY] JWT_SECRET is shorter than 32 chars. Use: openssl rand -base64 64');
}

/**
 * Verifica el JWT (solo HS256) y recarga rol/departamento desde la BD,
 * de modo que cambios de rol o usuarios eliminados surtan efecto de inmediato.
 * req.user mantiene la forma { userId, role, department } (compatible con clientes).
 */
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const parts = authHeader ? authHeader.split(' ') : [];
    const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, async (err, payload) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        }
        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: String(payload.userId) },
                select: { id: true, role: true, department: true, active: true }
            });
            if (!dbUser) {
                return res.status(401).json({ error: 'User no longer exists', code: 'INVALID_TOKEN' });
            }
            if (dbUser.active === false) {
                return res.status(401).json({ error: 'Account disabled', code: 'ACCOUNT_DISABLED' });
            }
            req.user = { userId: dbUser.id, role: dbUser.role, department: dbUser.department };
            next();
        } catch (e) {
            console.error('Auth user lookup failed:', e);
            res.status(500).json({ error: 'Authentication error' });
        }
    });
};

exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
    next();
};

exports.isManagerOrAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Access denied. Manager or Admin rights required.' });
    }
    next();
};

/**
 * Valida que un manager solo pueda acceder a su departamento
 * Los admins tienen acceso a todos los departamentos
 * El departamento puede venir de: params.department, query.department, o body.department
 */
exports.validateManagerDepartment = async (req, res, next) => {
    try {
        // Los admins pueden acceder a cualquier departamento
        if (req.user.role === 'ADMIN') {
            return next();
        }

        // Obtener departamento solicitado
        const requestedDept = req.params.department || req.params.dept || 
                             req.query.department || req.body.department;

        // Si no se especifica departamento, se asume que usa el del token
        if (!requestedDept) {
            return next();
        }

        // Validar que el manager solo acceda a su departamento
        if (req.user.department !== requestedDept) {
            return res.status(403).json({ 
                error: 'No autorizado para acceder a datos de este departamento',
                code: 'DEPARTMENT_FORBIDDEN'
            });
        }

        next();
    } catch (error) {
        console.error('Error in validateManagerDepartment middleware:', error);
        res.status(500).json({ error: 'Error validando permisos de departamento' });
    }
};
