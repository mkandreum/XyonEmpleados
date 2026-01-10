const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vite/Nginx)
const PORT = process.env.PORT || 3000;

// Security Middleware
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: isDevelopment ? false : {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com", "blob:"],
            connectSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"]
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.disable('x-powered-by'); // Hide Express signature

// Rate Limiting - General
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Reduced from 500 to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Rate Limiting - Strict for Authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts. Please try again in 15 minutes'
});

// Export authLimiter for use in routes
module.exports.authLimiter = authLimiter;

// Apply rate limiter to all requests
app.use(limiter);

// Middleware - CORS Configuration (SECURE)
const corsOptions = {
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' })); // Body limit to prevent DoS
app.use(morgan('dev'));

// Serve uploaded files statically
// Serve ONLY public files statically (logos, avatars)
app.use('/uploads/public', express.static(path.join(__dirname, '../uploads/public')));

// Static files (build from frontend)
// We assume the frontend will be built into a 'public' folder inside backend or similar
app.use(express.static(path.join(__dirname, '../public')));

const routes = require('./routes');

// API Routes
app.use('/api', routes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Fallback for SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function ensureAdminExists() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@xyonempleados.com';
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

        if (!adminPassword) {
            console.error('❌ FATAL ERROR: ADMIN_INITIAL_PASSWORD environment variable is not set');
            console.error('This is required for initial admin user creation');
            console.error('Generate one with: openssl rand -base64 32');
            process.exit(1);
        }

        // Check if admin exists first to NOT reset password
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12); // Increased from 10 to 12 rounds
            await prisma.user.create({
                data: {
                    email: adminEmail,
                    name: 'Admin User',
                    password: hashedPassword,
                    role: 'ADMIN',
                    department: 'IT',
                    position: 'System Administrator',
                    joinDate: new Date(),
                }
            });
            console.log('✓ Admin user created successfully');
            console.warn('⚠️  IMPORTANT: Change the admin password immediately after first login!');
        } else {
            console.log('✓ Admin user already exists');
        }
    } catch (error) {
        console.error('Error ensuring admin exists:', error);
        process.exit(1); // Exit if admin creation fails
    }
}

// Start server
ensureAdminExists().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
