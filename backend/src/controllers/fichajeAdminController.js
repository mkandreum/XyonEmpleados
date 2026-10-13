const prisma = require('../lib/prisma');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditService');
const { createNotification } = require('./notificationController');
const { getLocalMidnight } = require('../utils/fichajeUtils');

/**
 * Edicion directa de fichajes por ADMIN (cualquier usuario) o MANAGER (solo usuarios de su departamento,
 * y nunca los propios). Siempre exige un motivo y deja registro de auditoria.
 *
 *   POST   /api/fichajes/manual        { userId, tipo, timestamp, reason }
 *   PUT    /api/fichajes/manual/:id    { tipo?, timestamp?, reason }
 *   DELETE /api/fichajes/manual/:id    { reason }   (tambien admite ?reason=)
 */

class HttpError extends Error {
    constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

const TIPOS = ['ENTRADA', 'SALIDA'];
const MAX_FUTURE_SKEW_MS = 60 * 1000;

function parseReason(raw) {
    const reason = typeof raw === 'string' ? raw.trim() : '';
    if (reason.length < 3 || reason.length > 500) {
        throw new HttpError(400, 'El motivo es obligatorio (3-500 caracteres)');
    }
    return reason;
}

function parseTimestamp(raw) {
    if (typeof raw !== 'string' && !(raw instanceof Date)) throw new HttpError(400, 'timestamp invalido (ISO 8601)');
    const d = new Date(raw);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) throw new HttpError(400, 'timestamp invalido (ISO 8601)');
    if (d.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) throw new HttpError(400, 'No se pueden registrar fichajes en el futuro');
    return d;
}

function assertCanManage(req, targetUser) {
    if (req.user.role === 'ADMIN') return;
    if (req.user.role !== 'MANAGER') throw new HttpError(403, 'No autorizado');
    if (targetUser.id === req.user.userId) {
        throw new HttpError(403, 'Un manager no puede editar sus propios fichajes; solicitalo a un administrador');
    }
    if (targetUser.department !== req.user.department) {
        throw new HttpError(403, 'No autorizado para usuarios de otro departamento', 'DEPARTMENT_FORBIDDEN');
    }
}

function dayRange(date) {
    const start = getLocalMidnight(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

/**
 * Valida el dia resultante: orden estrictamente creciente (sin solapes ni duplicados), alternancia
 * ENTRADA/SALIDA empezando por ENTRADA. Devuelve si el dia queda cerrado.
 */
function validateDay(list) {
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sorted.length; i++) {
        const expected = i % 2 === 0 ? 'ENTRADA' : 'SALIDA';
        if (sorted[i].tipo !== expected) {
            throw new HttpError(400, `Secuencia invalida: se esperaba ${expected} en la posicion ${i + 1} del dia`);
        }
        if (i > 0 && sorted[i].timestamp.getTime() <= sorted[i - 1].timestamp.getTime()) {
            throw new HttpError(400, 'Los fichajes se solapan o tienen la misma hora');
        }
    }
    // true si el dia queda cerrado (numero par); un dia abierto se permite para poder crear la pareja en dos pasos
    return sorted.length % 2 === 0;
}

async function loadDay(tx, userId, date, excludeId) {
    const { start, end } = dayRange(date);
    const rows = await tx.fichaje.findMany({
        where: { userId, timestamp: { gte: start, lt: end }, ...(excludeId && { id: { not: excludeId } }) },
        select: { id: true, tipo: true, timestamp: true }
    });
    return rows;
}

function handleError(res, error, label) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message, ...(error.code && { code: error.code }) });
    }
    console.error(label, error);
    res.status(500).json({ error: 'Error al procesar el fichaje' });
}

async function notifyEmployee(userId, text) {
    try { await createNotification(userId, 'Fichaje modificado por administracion', text); } catch (e) { /* no critico */ }
}

const fmt = (d) => d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

exports.createManual = async (req, res) => {
    try {
        const { userId, tipo } = req.body || {};
        if (typeof userId !== 'string' || !userId) throw new HttpError(400, 'userId obligatorio');
        if (!TIPOS.includes(tipo)) throw new HttpError(400, 'Tipo de fichaje invalido');
        const reason = parseReason(req.body.reason);
        const timestamp = parseTimestamp(req.body.timestamp);

        const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, department: true, name: true } });
        if (!target) throw new HttpError(404, 'Usuario no encontrado');
        assertCanManage(req, target);

        let dayClosed;
        const fichaje = await prisma.$transaction(async (tx) => {
            const existing = await loadDay(tx, target.id, timestamp);
            dayClosed = validateDay([...existing, { tipo, timestamp }]);
            return tx.fichaje.create({
                data: { userId: target.id, tipo, timestamp, department: target.department }
            });
        });

        await logAudit(req.user.userId, AUDIT_ACTIONS.FICHAJE_MANUAL_CREATED, 'FICHAJE', fichaje.id,
            { targetUserId: target.id, tipo, timestamp: timestamp.toISOString(), reason }, req);
        await notifyEmployee(target.id, `Se ha anadido un fichaje de ${tipo} el ${fmt(timestamp)}. Motivo: ${reason}`);
        res.status(201).json({ ...fichaje, dayClosed });
    } catch (error) {
        handleError(res, error, 'Error creating manual fichaje:');
    }
};

exports.updateManual = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = parseReason(req.body && req.body.reason);
        const current = await prisma.fichaje.findUnique({ where: { id }, include: { user: { select: { id: true, department: true } } } });
        if (!current) throw new HttpError(404, 'Fichaje no encontrado');
        assertCanManage(req, current.user);

        const tipo = req.body.tipo !== undefined ? req.body.tipo : current.tipo;
        if (!TIPOS.includes(tipo)) throw new HttpError(400, 'Tipo de fichaje invalido');
        const timestamp = req.body.timestamp !== undefined ? parseTimestamp(req.body.timestamp) : current.timestamp;
        if (tipo === current.tipo && timestamp.getTime() === current.timestamp.getTime()) {
            throw new HttpError(400, 'No hay cambios que aplicar');
        }

        let dayClosed;
        const updated = await prisma.$transaction(async (tx) => {
            // Dia de destino con el fichaje ya modificado
            const targetDay = await loadDay(tx, current.userId, timestamp, id);
            dayClosed = validateDay([...targetDay, { tipo, timestamp }]);
            // Si cambia de dia, el dia de origen tambien debe seguir siendo valido
            if (dayRange(timestamp).start.getTime() !== dayRange(current.timestamp).start.getTime()) {
                const originDay = await loadDay(tx, current.userId, current.timestamp, id);
                validateDay(originDay);
            }
            return tx.fichaje.update({ where: { id }, data: { tipo, timestamp } });
        });

        await logAudit(req.user.userId, AUDIT_ACTIONS.FICHAJE_MANUAL_UPDATED, 'FICHAJE', id, {
            targetUserId: current.userId,
            before: { tipo: current.tipo, timestamp: current.timestamp.toISOString() },
            after: { tipo, timestamp: timestamp.toISOString() },
            reason
        }, req);
        await notifyEmployee(current.userId, `Un fichaje del ${fmt(current.timestamp)} se ha modificado (${tipo} ${fmt(timestamp)}). Motivo: ${reason}`);
        res.json({ ...updated, dayClosed });
    } catch (error) {
        handleError(res, error, 'Error updating manual fichaje:');
    }
};

exports.deleteManual = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = parseReason((req.body && req.body.reason) || req.query.reason);
        const current = await prisma.fichaje.findUnique({ where: { id }, include: { user: { select: { id: true, department: true } } } });
        if (!current) throw new HttpError(404, 'Fichaje no encontrado');
        assertCanManage(req, current.user);

        await prisma.$transaction(async (tx) => {
            // El resto del dia debe seguir alternando ENTRADA/SALIDA (no se exige cierre para poder retirar un fichaje erroneo)
            const rest = await loadDay(tx, current.userId, current.timestamp, id);
            validateDay(rest);
            await tx.lateArrivalNotification.deleteMany({ where: { fichajeId: id } });
            await tx.fichaje.delete({ where: { id } }); // los ajustes asociados se eliminan en cascada
        });

        await logAudit(req.user.userId, AUDIT_ACTIONS.FICHAJE_MANUAL_DELETED, 'FICHAJE', id, {
            targetUserId: current.userId, tipo: current.tipo, timestamp: current.timestamp.toISOString(), reason
        }, req);
        await notifyEmployee(current.userId, `Se ha eliminado tu fichaje de ${current.tipo} del ${fmt(current.timestamp)}. Motivo: ${reason}`);
        res.json({ success: true });
    } catch (error) {
        handleError(res, error, 'Error deleting manual fichaje:');
    }
};
