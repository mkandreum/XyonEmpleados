const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { getRealIp } = require('./utils/requestInfo');
const { getTodayRange } = require('./utils/fichajeUtils');
const { notifyUser } = require('./services/notificationService');
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
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
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

// Rate Limiting - Clave por IP REAL del cliente.
// Detras de Cloudflare req.ip puede resolver a un IP del borde (compartido entre
// usuarios) o cambiar en cada peticion; getRealIp (cf-connecting-ip / XFF) da el IP
// verdadero, que es el que ya se registra en los logs de seguridad.
const clientIpKey = (req) => ipKeyGenerator(getRealIp(req) || req.ip);

// Rate Limiting - General
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased to 1000 to prevent false positives on dashboard load
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpKey,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Rate Limiting - Strict for Authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpKey,
    message: { error: 'Too many login attempts. Please try again in 15 minutes' }
});

// Rate Limiting - forgot/reset password (cuenta tambien las peticiones correctas: evita spam de emails)
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIpKey,
    message: { error: 'Too many requests. Please try again later.' }
});

// Rate Limiting - forgot-password POR EMAIL.
// El IP de origen puede rotar (bots/proxies), asi que el limitador por IP no basta:
// aqui la clave es la cuenta objetivo, no quien hace la peticion.
const passwordResetEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        return email ? `reset-email:${email.slice(0, 254)}` : clientIpKey(req);
    },
    message: { error: 'Too many requests. Please try again later.' }
});

// Export limiters for use in routes
module.exports.authLimiter = authLimiter;
module.exports.passwordResetLimiter = passwordResetLimiter;
module.exports.passwordResetEmailLimiter = passwordResetEmailLimiter;

// Apply rate limiter to all requests
app.use(limiter);

// Middleware - CORS Configuration (SECURE)
const sameOrigin = (origin, req) => {
    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return !!host && new URL(origin).host === String(host).split(',')[0].trim();
    } catch {
        return false;
    }
};
const corsOptionsFor = (req) => ({
    origin: function (origin, callback) {
        // No Origin header: native app, curl, server-to-server (no browser CORS involved)
        if (!origin) return callback(null, true);

        // FRONTEND_URL puede ser una lista separada por comas
        const allowed = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean);
        // Fail closed: without FRONTEND_URL only the app's own origin (web served by this server) is allowed
        if (allowed.includes(origin) || sameOrigin(origin, req)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // El API usa Bearer token (no cookies): credentials no es necesario
    maxAge: 86400 // 24 hours
});
app.use(cors((req, cb) => cb(null, corsOptionsFor(req))));
app.use(express.json({ limit: '100kb' })); // Body limit to prevent DoS
app.use(morgan(isDevelopment ? 'dev' : 'combined'));

// Serve uploaded files statically
// Serve ONLY public files statically (logos, avatars)
app.use('/uploads/public', express.static(path.join(__dirname, '../uploads/public'), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true,
    dotfiles: 'deny',
    index: false,
    setHeaders: (res) => {
        // Evita ejecucion de contenido subido (p.ej. SVG/HTML antiguos) en el origen de la app
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    }
}));

// Serve a SW-killer: unregisters itself and deletes all caches
// This ensures any previously installed SW gets nuked on next check
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
// Self-destructing service worker - removes itself and all caches
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    }).then(function() {
      return self.registration.unregister();
    }).then(function() {
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(c) { c.navigate(c.url); });
    })
  );
});
`);
});
app.get('/registerSW.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/javascript');
    res.send('// No service worker');
});
app.get('/push-sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../public/push-sw.js'));
});

// Static files (build from frontend) with aggressive caching for hashed assets
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1y', // Cache hashed assets for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // For HTML files, prevent caching to ensure users get the latest version
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // For hashed assets (JS, CSS with hash in filename), aggressive caching
        else if (/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // For other assets, moderate caching
        else {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));

const routes = require('./routes');
const { createNotification } = require('./controllers/notificationController');

// API Routes
app.use('/api', routes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Fallback for SPA
app.get('*', (req, res) => {
    // Don't serve index.html for API calls OR missing static assets
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/uploads/') ||
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|doc|docx|xls|xlsx)$/)) {
        return res.status(404).json({ error: 'Resource not found' });
    }

    // EXTREME anti-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Clear browser cache (NOT storage - that would delete auth token)
    res.setHeader('Clear-Site-Data', '"cache"');

    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler global: no filtrar detalles internos
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    if (err && (err.name === 'MulterError' || /^Invalid file type/.test(err.message || ''))) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : 'Invalid upload' });
    }
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large' });
    }
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');
const { createDefaultTemplates } = require('./services/emailTemplateService');

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

async function initializeEmailTemplates() {
    try {
        console.log('📧 Initializing email templates...');
        await createDefaultTemplates();
        console.log('✓ Email templates initialized');
    } catch (error) {
        console.error('Error initializing email templates:', error);
        // Don't exit, just log the error
    }
}

// Send email reminder 30 minutes before shift start time
async function sendShiftReminderEmails() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    try {
        // Get all shifts (unified model)
        const shifts = await prisma.departmentShift.findMany();
        const { today, tomorrow } = getTodayRange(now);

        for (const shift of shifts) {
            if (shift.flexibleSchedule) continue;

            // Check if it's an active day for this shift
            const dayOfWeek = now.getDay();
            const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
            const todayDayName = dayNames[dayOfWeek];
            
            if (!shift.activeDays.includes(todayDayName)) {
                continue;
            }

            const [h, m] = shift.horaEntrada.split(':').map(Number);
            const entryMinutes = h * 60 + m;
            const reminderMinutes = entryMinutes - 30; // 30 minutes before

            // Only send if we're within a 5-minute window to avoid duplicates
            if (currentMinutes < reminderMinutes - 2 || currentMinutes > reminderMinutes + 2) {
                continue;
            }

            // Find users in this department who want reminders
            const users = await prisma.user.findMany({
                where: { 
                    department: shift.department,
                    active: true,
                    shiftReminderEmail: true // Must have enabled reminders
                },
                select: { id: true, email: true, name: true }
            });

            for (const user of users) {
                // Check if user already clocked in today
                const hasEntryToday = await prisma.fichaje.findFirst({
                    where: {
                        userId: user.id,
                        tipo: 'ENTRADA',
                        timestamp: {
                            gte: today,
                            lt: tomorrow
                        }
                    }
                });

                if (hasEntryToday) continue;

                // Prevent duplicate reminders
                const existingReminder = await prisma.notification.findFirst({
                    where: {
                        userId: user.id,
                        title: 'Recordatorio de Fichaje',
                        createdAt: {
                            gte: today,
                            lt: tomorrow
                        }
                    }
                });

                if (existingReminder) continue;

                try {
                    // Use centralized notification service (imported at top)
                    await notifyUser(
                        user.id,
                        'GENERIC',
                        {
                            title: 'Recordatorio de Fichaje',
                            message: `Tienes ${shift.name} en 30 minutos. Tu entrada está configurada para las ${shift.horaEntrada}. ¡No olvides fichar!`
                        },
                        { sendEmail: true, sendPush: true }
                    );
                    console.log(`✅ Shift reminder sent to ${user.email}`);
                } catch (error) {
                    console.error(`Error sending reminder to ${user.email}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error in sendShiftReminderEmails:', error);
    }
}

// Start server
Promise.all([
    ensureAdminExists(),
    initializeEmailTemplates()
]).then(() => {
    // Start reminder loop after startup
    setInterval(sendShiftReminderEmails, 5 * 60 * 1000); // every 5 minutes
    // Kick off once shortly after boot
    setTimeout(sendShiftReminderEmails, 30 * 1000);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

