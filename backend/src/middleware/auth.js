const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        }
        req.user = user;
        next();
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
