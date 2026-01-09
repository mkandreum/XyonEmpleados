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
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com", "blob:"],
            connectSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        },
    },
}));
app.disable('x-powered-by'); // Hide Express signature

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
// Apply rate limiter to all requests
app.use(limiter);

// Middleware
app.use(cors()); // Configure this restrictively in production!
app.use(express.json({ limit: '10kb' })); // Body limit to prevent DoS
app.use(morgan('dev'));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
        const adminEmail = 'admin@velilla.com';

        // Check if admin exists first to NOT reset password
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin_password_123', 10);
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
            console.log('✓ Admin user created');
        } else {
            console.log('✓ Admin user already exists');
        }
    } catch (error) {
        console.error('Error ensuring admin exists:', error);
    }
}

// Start server
ensureAdminExists().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
