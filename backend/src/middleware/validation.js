const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
        if (error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }
        next();
    };
};

// Authentication Schemas
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'El formato del email no es válido',
        'any.required': 'El email es obligatorio'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'any.required': 'La contraseña es obligatoria'
    })
});

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede superar los 100 caracteres',
        'any.required': 'El nombre es obligatorio'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'El formato del email no es válido',
        'any.required': 'El email es obligatorio'
    }),
    password: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 12 caracteres',
            'string.pattern.base': 'La contraseña debe incluir mayúsculas, minúsculas, un número y un símbolo',
            'any.required': 'La contraseña es obligatoria'
        }),
    department: Joi.string().max(100).optional(),
    position: Joi.string().max(100).optional(),
    invitationCode: Joi.string().required().messages({
        'any.required': 'El código de invitación es obligatorio'
    })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'La contraseña actual es obligatoria'
    }),
    newPassword: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
        .required()
        .messages({
            'string.min': 'La nueva contraseña debe tener al menos 12 caracteres',
            'string.pattern.base': 'La contraseña debe incluir mayúsculas, minúsculas, un número y un símbolo',
            'any.required': 'La nueva contraseña es obligatoria'
        })
});

// User Profile Schema
const updateProfileSchema = Joi.object({
    phone: Joi.string().pattern(/^\+?[0-9\s\-()]+$/).max(20).optional().allow(''),
    address: Joi.string().max(200).optional().allow(''),
    emergencyContact: Joi.string().max(200).optional().allow(''),
    avatarUrl: Joi.string().max(500).optional().allow(''),
    shiftReminderEmail: Joi.boolean().optional()
});

// Vacation Request Schema
const vacationRequestSchema = Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    days: Joi.number().integer().min(1).max(365).required(),
    hours: Joi.number().integer().min(0).optional().allow(null),
    type: Joi.string().valid('VACATION', 'PERSONAL', 'SICK_LEAVE', 'MEDICAL_LEAVE', 'OVERTIME', 'OTHER').required(),
    subtype: Joi.string().max(100).optional().allow('', null),
    status: Joi.string().optional(), // Allow status to be sent from frontend
    justificationUrl: Joi.string().max(500).optional().allow('', null)
});

const strongPassword = Joi.string().min(12).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character' });

const adminCreateUserSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(254).required(),
    password: strongPassword.required(),
    role: Joi.string().valid('EMPLOYEE', 'MANAGER', 'ADMIN').optional(),
    department: Joi.string().max(100).optional().allow(''),
    position: Joi.string().max(100).optional().allow(''),
    joinDate: Joi.date().iso().optional().allow(null, ''),
    avatarUrl: Joi.string().max(500).pattern(/^(\/uploads\/public\/|https:\/\/)/).optional().allow('', null)
});

const adminUpdateUserSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().max(254).optional(),
    role: Joi.string().valid('EMPLOYEE', 'MANAGER', 'ADMIN').optional(),
    department: Joi.string().max(100).optional().allow(''),
    position: Joi.string().max(100).optional().allow(''),
    joinDate: Joi.date().iso().optional().allow(null, ''),
    active: Joi.boolean().optional(),
    avatarUrl: Joi.string().max(500).pattern(/^(\/uploads\/public\/|https:\/\/)/).optional().allow('', null)
}).unknown(true);

// Export validation middleware
module.exports = {
    validate,
    loginSchema,
    registerSchema,
    changePasswordSchema,
    updateProfileSchema,
    vacationRequestSchema,
    adminCreateUserSchema,
    adminUpdateUserSchema
};
