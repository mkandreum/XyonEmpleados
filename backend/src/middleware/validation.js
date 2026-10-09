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
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required'
    })
});

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name must not exceed 100 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 12 characters',
            'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character (@$!%*?&)',
            'any.required': 'Password is required'
        }),
    department: Joi.string().max(100).optional(),
    position: Joi.string().max(100).optional(),
    invitationCode: Joi.string().required().messages({
        'any.required': 'Invitation code is required'
    })
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Current password is required'
    }),
    newPassword: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
            'string.min': 'New password must be at least 12 characters',
            'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character (@$!%*?&)',
            'any.required': 'New password is required'
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
