const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getTodayRange } = require('./utils/fichajeUtils');
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

// Rate Limiting - General
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased to 1000 to prevent false positives on dashboard load
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
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // If FRONTEND_URL is set, use it
        if (process.env.FRONTEND_URL) {
            if (origin === process.env.FRONTEND_URL) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // In production without FRONTEND_URL, allow same-origin
            // Coolify will handle the domain automatically
            callback(null, true);
        }
    },
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
app.use('/uploads/public', express.static(path.join(__dirname, '../uploads/public'), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true,
}));

// Force no-cache on service worker file + inject cache cleanup
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/javascript');

    const fs = require('fs');
    const swPath = path.join(__dirname, '../public/sw.js');

    // Prepend aggressive cache cleanup code to the generated SW
    // This ensures that when the new SW activates, it DELETES all old caches
    // and forces all open windows to reload immediately
    const cleanupCode = `
// === INJECTED CACHE CLEANUP (server-side) ===
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[sw-cleanup] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[sw-cleanup] All caches deleted, reloading clients...');
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
    })
  );
});
// === END INJECTED CACHE CLEANUP ===
`;

    if (fs.existsSync(swPath)) {
        const swContent = fs.readFileSync(swPath, 'utf8');
        res.send(cleanupCode + swContent);
    } else {
        // If no sw.js exists yet (first deploy), serve a no-op cleanup SW
        res.send(cleanupCode + `
self.addEventListener('install', function() { self.skipWaiting(); });
`);
    }
});
app.get('/registerSW.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../public/registerSW.js'));
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

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
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

// Periodic reminders to clock in near department start time
async function sendEntryReminders() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    try {
        const schedules = await prisma.departmentSchedule.findMany();
        const { today, tomorrow } = getTodayRange(now);

        for (const schedule of schedules) {
            if (schedule.flexibleSchedule) continue;

            const [h, m] = schedule.horaEntrada.split(':').map(Number);
            const entryMinutes = h * 60 + m;
            const windowStart = entryMinutes - 10; // 10 minutes before start
            const windowEnd = entryMinutes + schedule.toleranciaMinutos; // until tolerance expires

            if (currentMinutes < windowStart || currentMinutes > windowEnd) {
                continue;
            }

            const users = await prisma.user.findMany({
                where: { department: schedule.department },
                select: { id: true, name: true }
            });

            for (const user of users) {
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

                // Prevent duplicate reminders in the same day
                const existingReminder = await prisma.notification.findFirst({
                    where: {
                        userId: user.id,
                        title: 'Recordatorio de fichaje',
                        date: {
                            gte: today,
                            lt: tomorrow
                        }
                    }
                });

                if (existingReminder) continue;

                await createNotification(
                    user.id,
                    'Recordatorio de fichaje',
                    `Recuerda fichar tu entrada para ${schedule.department}.`
                );
            }
        }
    } catch (error) {
        console.error('Error sending entry reminders:', error);
    }
}

// Start server
Promise.all([
    ensureAdminExists(),
    initializeEmailTemplates()
]).then(() => {
    // Start reminder loop after startup
    setInterval(sendEntryReminders, 5 * 60 * 1000); // every 5 minutes
    // Kick off once shortly after boot
    setTimeout(sendEntryReminders, 30 * 1000);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

