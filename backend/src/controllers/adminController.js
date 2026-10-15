const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { createNotification } = require('./notificationController');
const { updateUserBalanceLogic } = require('./benefitsController');
const { sendTemplateEmail, sendPasswordResetEmail } = require('../services/emailService');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditService');
const Joi = require('joi');
const { encryptSMTPPassword } = require('../utils/encryptionUtils');

const ensureDepartmentSetting = async (department) => {
    if (!department) return;

    const existing = await prisma.globalSettings.findUnique({
        where: { key: 'DEPARTMENTS' }
    });

    let departments = [];
    if (existing?.value) {
        try {
            const parsed = JSON.parse(existing.value);
            if (Array.isArray(parsed)) {
                departments = parsed;
            }
        } catch (error) {
            console.error('Error parsing departments setting:', error);
        }
    }

    if (!departments.includes(department)) {
        const updated = [...departments, department];
        await prisma.globalSettings.upsert({
            where: { key: 'DEPARTMENTS' },
            update: { value: JSON.stringify(updated) },
            create: { key: 'DEPARTMENTS', value: JSON.stringify(updated) }
        });
    }
};

// --- User Management ---

exports.getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                position: true,
                active: true,
                createdAt: true,
                // Exclude sensitive data specifically, though select does this by inclusion
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, position, joinDate } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'EMPLOYEE',
                department: department || 'General',
                position: position || 'Employee',
                joinDate: joinDate ? new Date(joinDate) : new Date(),
                avatarUrl: req.body.avatarUrl || await (async () => {
                    // Try to get default avatar from settings
                    const defaultAvatarSetting = await prisma.globalSettings.findUnique({
                        where: { key: 'defaultAvatarUrl' }
                    });
                    if (defaultAvatarSetting) return defaultAvatarSetting.value;

                    return null; // No default avatar
                })()
            }
        });

        await ensureDepartmentSetting(user.department);

        const { password: _, ...userNoPass } = user;
        res.status(201).json(userNoPass);
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, department, position, joinDate, avatarUrl, active } = req.body;
        // Note: Password update should probably be a separate secure endpoint or handled carefully

        // No permitir degradar al ultimo admin ni auto-degradarse
        if (role && role !== 'ADMIN') {
            const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
            if (current && current.role === 'ADMIN') {
                const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
                if (adminCount <= 1 || id === req.user.userId) {
                    return res.status(400).json({ error: 'No se puede quitar el rol ADMIN al ultimo administrador o a uno mismo' });
                }
            }
        }
        const updateData = { name, email, role, department, position };
        if (typeof active === 'boolean') {
            if (!active) {
                if (id === req.user.userId) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
                const cur = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });
                if (cur && cur.role === 'ADMIN' && cur.active && (await prisma.user.count({ where: { role: 'ADMIN', active: true } })) <= 1) {
                    return res.status(400).json({ error: 'No puedes desactivar al ultimo administrador activo' });
                }
            }
            updateData.active = active;
        }
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        if (joinDate) {
            updateData.joinDate = new Date(joinDate);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        await ensureDepartmentSetting(user.department);

        const { password: _, ...userNoPass } = user;
        res.json(userNoPass);
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que no se auto-elimine
        if (id === req.user.userId) {
            return res.status(400).json({
                error: 'No puedes eliminar tu propia cuenta. Contacta con otro administrador.'
            });
        }
        
        const userToDelete = await prisma.user.findUnique({
            where: { id },
            select: { role: true, name: true }
        });
        
        if (!userToDelete) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Si es admin, verificar que no sea el último
        if (userToDelete.role === 'ADMIN') {
            const adminCount = await prisma.user.count({
                where: { role: 'ADMIN' }
            });
            
            if (adminCount <= 1) {
                return res.status(400).json({
                    error: 'No puedes eliminar el último administrador del sistema. Crea otro admin primero.'
                });
            }
        }
        
        await prisma.user.delete({ where: { id } });
        res.json({ message: `Usuario ${userToDelete.name} eliminado correctamente` });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// --- Activar / desactivar usuarios ---

/**
 * PATCH|PUT /api/admin/users/:id/active  { active: boolean }
 * Un usuario inactivo no puede iniciar sesion y sus tokens dejan de valer (el middleware relee la BD),
 * se excluye de recordatorios/avisos, pero se conserva todo su historial.
 */
exports.setUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body || {};
        if (typeof active !== 'boolean') {
            return res.status(400).json({ error: 'El campo "active" (boolean) es obligatorio' });
        }
        const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, active: true, name: true } });
        if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (!active) {
            if (id === req.user.userId) {
                return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
            }
            if (target.role === 'ADMIN' && target.active) {
                const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
                if (activeAdmins <= 1) {
                    return res.status(400).json({ error: 'No puedes desactivar al ultimo administrador activo' });
                }
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: { active },
            select: { id: true, name: true, email: true, role: true, department: true, position: true, active: true, createdAt: true }
        });
        await logAudit(req.user.userId, AUDIT_ACTIONS.USER_UPDATED, 'USER', id, { change: active ? 'REACTIVATED' : 'DEACTIVATED' }, req);
        res.json(user);
    } catch (error) {
        console.error('Set user active error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

// --- Importacion masiva segura ---

const IMPORT_MAX_ROWS = 300;
const importRowSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().lowercase().email().max(254).required(),
    role: Joi.string().trim().uppercase().valid('EMPLOYEE', 'MANAGER', 'ADMIN').optional(),
    department: Joi.string().trim().max(100).optional().allow(''),
    position: Joi.string().trim().max(100).optional().allow(''),
    joinDate: Joi.date().iso().optional().allow(null, '')
}).unknown(true); // columnas extra (p. ej. password) se ignoran: nunca se usan contrasenas del fichero

// Parser CSV minimo (separador , o ; ; comillas dobles; primera fila = cabecera)
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === sep) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some(v => v.trim() !== '')) rows.push(row);
            row = [];
        } else field += c;
    }
    row.push(field);
    if (row.some(v => v.trim() !== '')) rows.push(row);
    if (rows.length < 2) return [];
    const header = rows[0].map(h => h.replace(/^﻿/, '').trim());
    return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

/**
 * Nucleo comun: valida filas, crea usuarios con contrasena aleatoria NO revelada y envia enlace de alta.
 * @returns {Promise<{results: Array, summary: Object}>}
 */
async function processUserImport(rows, { dryRun, sendInvites }) {
    const results = [];
    const seen = new Set();
    for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const entry = { row: i + 1, email: raw && typeof raw.email === 'string' ? raw.email : null, status: 'ERROR', error: null, inviteSent: false };
        results.push(entry);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { entry.error = 'Fila invalida'; continue; }
        const { value, error } = importRowSchema.validate(raw, { abortEarly: true, stripUnknown: true });
        if (error) { entry.error = error.details[0].message; continue; }
        entry.email = value.email;
        if (seen.has(value.email)) { entry.error = 'Email duplicado en el fichero'; continue; }
        seen.add(value.email);
        if (await prisma.user.findUnique({ where: { email: value.email }, select: { id: true } })) {
            entry.status = 'SKIPPED'; entry.error = 'El usuario ya existe'; continue;
        }
        if (dryRun) { entry.status = 'WOULD_CREATE'; continue; }

        try {
            // Contrasena aleatoria que nadie conoce: el usuario fija la suya con el enlace de alta
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(24).toString('base64'), 12);
            const resetToken = crypto.randomBytes(32).toString('hex');
            const user = await prisma.user.create({
                data: {
                    name: value.name,
                    email: value.email,
                    password: hashedPassword,
                    role: value.role || 'EMPLOYEE',
                    department: value.department || 'General',
                    position: value.position || 'Employee',
                    joinDate: value.joinDate ? new Date(value.joinDate) : new Date(),
                    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(value.name)}`,
                    resetToken: await bcrypt.hash(resetToken, 10),
                    resetTokenExpiry: new Date(Date.now() + 72 * 3600 * 1000)
                }
            });
            await ensureDepartmentSetting(user.department);
            entry.status = 'CREATED';
            entry.userId = user.id;
            if (sendInvites) {
                try {
                    const frontendUrl = (process.env.FRONTEND_URL || 'https://portalempleado.xyoncloud.win').split(',')[0].trim();
                    const link = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
                    entry.inviteSent = (await sendPasswordResetEmail(user.email, link, { invite: true })) === true;
                } catch (mailErr) {
                    console.error('Invite email failed:', mailErr.message);
                }
            }
        } catch (err) {
            console.error('Import row failed:', err);
            entry.status = 'ERROR'; entry.error = 'No se pudo crear el usuario';
        }
    }
    const count = (s) => results.filter(r => r.status === s).length;
    return {
        results,
        summary: {
            total: results.length,
            created: count('CREATED'),
            wouldCreate: count('WOULD_CREATE'),
            skipped: count('SKIPPED'),
            errors: count('ERROR'),
            invitesSent: results.filter(r => r.inviteSent).length
        }
    };
}

function extractImportRows(body) {
    const rows = Array.isArray(body) ? body : (body && (body.users || (typeof body.csv === 'string' ? parseCsv(body.csv) : null)));
    if (!Array.isArray(rows)) return { error: 'Se esperaba un array de usuarios, {users:[...]} o {csv:"..."}' };
    if (rows.length === 0) return { error: 'No hay filas que importar' };
    if (rows.length > IMPORT_MAX_ROWS) return { error: `Maximo ${IMPORT_MAX_ROWS} filas por importacion` };
    return { rows };
}

/**
 * POST /api/admin/users/import  { users:[{name,email,role?,department?,position?,joinDate?}] | csv:"...", dryRun?:bool, sendInvites?:bool (def. true) }
 * Solo ADMIN. Respuesta: { dryRun, summary, results:[{row,email,status,error,inviteSent}] }
 */
exports.importUsersSafe = async (req, res) => {
    try {
        const { rows, error } = extractImportRows(req.body);
        if (error) return res.status(400).json({ error });
        const opts = Array.isArray(req.body) ? {} : req.body;
        const dryRun = opts.dryRun === true;
        const sendInvites = opts.sendInvites !== false;
        const { results, summary } = await processUserImport(rows, { dryRun, sendInvites });
        if (!dryRun) {
            await logAudit(req.user.userId, AUDIT_ACTIONS.USER_CREATED, 'USER', 'bulk-import', { created: summary.created, total: summary.total }, req);
        }
        res.json({ dryRun, summary, results });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to import users' });
    }
};

/**
 * POST /api/admin/users/bulk (compatibilidad con el frontend web): mismo nucleo seguro,
 * respuesta con la forma anterior { message, results:{success,failed,errors[]} } mas el detalle por fila.
 */
exports.importUsers = async (req, res) => {
    try {
        const { rows, error } = extractImportRows(req.body);
        if (error) return res.status(400).json({ error });
        const { results, summary } = await processUserImport(rows, { dryRun: false, sendInvites: true });
        await logAudit(req.user.userId, AUDIT_ACTIONS.USER_CREATED, 'USER', 'bulk-import', { created: summary.created, total: summary.total }, req);
        res.json({
            message: 'Import completed',
            results: {
                success: summary.created,
                failed: summary.total - summary.created,
                errors: results.filter(r => r.status !== 'CREATED').map(r => `${r.email}: ${r.error}`),
                rows: results,
                invitesSent: summary.invitesSent
            }
        });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to import users' });
    }
};

// --- Vacation Management ---

exports.getAllVacations = async (req, res) => {
    try {
        const vacations = await prisma.vacationRequest.findMany({
            include: {
                user: {
                    select: { name: true, email: true, department: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(vacations);
    } catch (error) {
        console.error("Get admin vacations error:", error);
        res.status(500).json({ error: 'Failed to fetch vacations' });
    }
};

exports.updateVacationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED', 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Estado invalido' });
        }

        const vacation = await prisma.vacationRequest.update({
            where: { id },
            data: { status },
            include: {
                user: {
                    select: { email: true, name: true }
                }
            }
        });

        if (status === 'APPROVED') {
            try {
                await updateUserBalanceLogic(vacation.userId, vacation.type, vacation.days, vacation.hours, vacation.subtype);
            } catch (err) {
                console.error("Failed to update user balance on approval:", err);
                // Don't fail the request, but log error. Maybe notify admin?
            }
        }

        // NOTIFICATION: Notify User
        let title = 'Actualización de Solicitud';
        let message = `El estado de tu solicitud ha cambiado a: ${status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'}`;

        await createNotification(
            vacation.userId,
            title,
            message
        );

        // 🔔 ENVIAR EMAIL AL EMPLEADO
        const getTypeLabel = (t, st) => {
            switch (t) {
                case 'VACATION': return 'Vacaciones';
                case 'SICK_LEAVE': return 'Horas médicas';
                case 'MEDICAL_LEAVE': return 'Baja médica';
                case 'PERSONAL': return 'Asuntos Propios';
                case 'OVERTIME': return 'Horas Exceso';
                case 'OTHER': return st || 'Otros Permisos';
                default: return t;
            }
        };

        const emailVariables = {
            employeeName: vacation.user.name,
            requestType: getTypeLabel(vacation.type, vacation.subtype),
            startDate: new Date(vacation.startDate).toLocaleDateString('es-ES'),
            endDate: new Date(vacation.endDate).toLocaleDateString('es-ES'),
            days: vacation.days ? vacation.days.toString() : (vacation.hours + ' horas'),
            reason: status === 'REJECTED' ? 'El administrador ha rechazado la solicitud' : ''
        };

        const templateType = status === 'APPROVED' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
        await sendTemplateEmail(vacation.user.email, templateType, emailVariables);

        res.json(vacation);
    } catch (error) {
        console.error("Update vacation status error:", error);
        res.status(500).json({ error: 'Failed to update vacation status' });
    }
};

// --- Global Settings ---

const SECRET_MASK = '********';

exports.getSettings = async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findMany();
        // Convert array to object for easier frontend consumption
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        // Nunca devolver secretos (ni siquiera cifrados): se indica solo si estan configurados
        if (settingsObj.smtpPass) settingsObj.smtpPass = SECRET_MASK;
        res.json(settingsObj);
    } catch (error) {
        console.error("Get settings error:", error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = { ...req.body }; // Expects object like { logoUrl: '...', companyName: '...', defaultAvatarUrl: '...' }
        // Solo valores string, claves razonables; la mascara de secreto no se persiste
        for (const k of Object.keys(settings)) {
            if (!/^[A-Za-z0-9_.-]{1,64}$/.test(k) || /^audit_/i.test(k) || typeof settings[k] !== 'string' || settings[k].length > 20000) {
                return res.status(400).json({ error: `Ajuste invalido: ${k}` });
            }
        }
        if (settings.smtpPass === SECRET_MASK) delete settings.smtpPass;
        const keys = Object.keys(settings);

        // Cifrar contraseña SMTP si está presente
        if (settings.smtpPass && settings.smtpPass.trim() !== '') {
            settings.smtpPass = encryptSMTPPassword(settings.smtpPass);
        }

        // Upsert each setting
        const promises = keys.map(key =>
            prisma.globalSettings.upsert({
                where: { key },
                update: { value: settings[key] },
                create: { key, value: settings[key] }
            })
        );

        await Promise.all(promises);

        // If defaultAvatarUrl was updated, apply it to all users who are using ui-avatars
        if (settings.defaultAvatarUrl) {
            await prisma.user.updateMany({
                where: {
                    OR: [
                        { avatarUrl: { startsWith: 'https://ui-avatars.com' } },
                        { avatarUrl: null }
                    ]
                },
                data: {
                    avatarUrl: settings.defaultAvatarUrl
                }
            });
            console.log('✅ Updated all users with default avatar:', settings.defaultAvatarUrl);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Update settings error:", error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// --- Payroll Management ---

exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            include: {
                user: {
                    select: { name: true, email: true, department: true }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.json(payrolls);
    } catch (error) {
        console.error("Get admin payrolls error:", error);
        res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
};

exports.deletePayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const fs = require('fs');
        const path = require('path');

        const payroll = await prisma.payroll.findUnique({
            where: { id },
            select: { pdfUrl: true, signedPdfUrl: true }
        });

        if (payroll) {
            // Delete primary PDF
            if (payroll.pdfUrl) {
                const relativePath = payroll.pdfUrl.replace('/api/files/', '');
                const fullPath = path.resolve(__dirname, '../../uploads/private', relativePath);
                if (fullPath.startsWith(path.resolve(__dirname, '../../uploads/private') + path.sep) && fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            // Delete signed PDF if it exists
            if (payroll.signedPdfUrl) {
                const relativePath = payroll.signedPdfUrl.replace('/api/files/', '');
                const fullPath = path.resolve(__dirname, '../../uploads/private', relativePath);
                if (fullPath.startsWith(path.resolve(__dirname, '../../uploads/private') + path.sep) && fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }

        await prisma.payroll.delete({ where: { id } });
        res.json({ message: 'Payroll and associated files deleted successfully' });
    } catch (error) {
        console.error("Delete payroll error:", error);
        res.status(500).json({ error: 'Failed to delete payroll' });
    }
};

// --- Invitation Codes ---

exports.getInviteCodes = async (req, res) => {
    try {
        const codes = await prisma.invitationCode.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(codes);
    } catch (error) {
        console.error("Get invite codes error:", error);
        res.status(500).json({ error: 'Failed to fetch invite codes' });
    }
};

const crypto = require('crypto');

exports.generateInviteCode = async (req, res) => {
    try {
        // Generate a cryptographically strong random code (8 chars hex)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();

        const invite = await prisma.invitationCode.create({
            data: {
                code
            }
        });
        res.status(201).json(invite);
    } catch (error) {
        if (error.code === 'P2002') {
            // Rare collision
            return res.status(409).json({ error: 'Code collision, please try again' });
        }
        console.error("Generate invite code error:", error);
        res.status(500).json({ error: 'Failed to generate invite code' });
    }
};

exports.revokeInviteCode = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.invitationCode.delete({ where: { id } });
        res.json({ message: 'Invitation code revoked' });
    } catch (error) {
        console.error("Revoke invite code error:", error);
        res.status(500).json({ error: 'Failed to revoke invite code' });
    }
};

// --- Office Locations (GPS Validation) ---

/**
 * GET /api/admin/office-locations
 * Obtener todas las ubicaciones de oficina configuradas
 */
exports.getOfficeLocations = async (req, res) => {
    try {
        const settings = await prisma.globalSettings.findMany({
            where: {
                key: {
                    startsWith: 'officeLocation_'
                }
            }
        });

        const locations = settings.map(setting => {
            const department = setting.key.replace('officeLocation_', '');
            let location = null;
            try {
                location = JSON.parse(setting.value);
            } catch (e) {
                console.error(`Error parsing location for ${department}:`, e);
            }
            return {
                department,
                ...location,
                updatedAt: setting.updatedAt
            };
        });

        res.json(locations);
    } catch (error) {
        console.error('Get office locations error:', error);
        res.status(500).json({ error: 'Failed to fetch office locations' });
    }
};

/**
 * POST /api/admin/office-locations/:department
 * Configurar o actualizar ubicación de oficina para un departamento
 * Body: { latitude, longitude, maxDistance, required, name }
 */
exports.setOfficeLocation = async (req, res) => {
    try {
        const { department } = req.params;
        const { latitude, longitude, maxDistance, required, name } = req.body;

        // Validar coordenadas
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return res.status(400).json({ error: 'Latitud y longitud deben ser números' });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ error: 'Coordenadas GPS inválidas' });
        }

        const locationData = {
            latitude,
            longitude,
            maxDistance: maxDistance || 500, // Default 500m
            required: required || false, // Si true, fichaje sin GPS será rechazado
            name: name || `Oficina ${department}`,
            updatedAt: new Date().toISOString()
        };

        await prisma.globalSettings.upsert({
            where: { key: `officeLocation_${department}` },
            update: { value: JSON.stringify(locationData) },
            create: { 
                key: `officeLocation_${department}`, 
                value: JSON.stringify(locationData) 
            }
        });

        res.json({ 
            message: `Ubicación de oficina configurada para ${department}`,
            location: locationData 
        });
    } catch (error) {
        console.error('Set office location error:', error);
        res.status(500).json({ error: 'Failed to set office location' });
    }
};

/**
 * DELETE /api/admin/office-locations/:department
 * Eliminar configuración de ubicación de oficina
 */
exports.deleteOfficeLocation = async (req, res) => {
    try {
        const { department } = req.params;
        
        await prisma.globalSettings.delete({
            where: { key: `officeLocation_${department}` }
        });

        res.json({ message: `Ubicación de oficina eliminada para ${department}` });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Ubicación no encontrada' });
        }
        console.error('Delete office location error:', error);
        res.status(500).json({ error: 'Failed to delete office location' });
    }
};
