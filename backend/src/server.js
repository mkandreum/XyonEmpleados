const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

// Database client
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function ensureAdminExists() {
    try {
        const adminEmail = 'admin@velilla.com';
        const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

        if (!existingAdmin) {
            console.log('Admin user not found. Creating default admin...');
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
            console.log('Default admin created.');
        } else {
            console.log('Admin user already exists.');
        }
    } catch (error) {
        console.error('Error checking/creating admin user:', error);
    }
}

// Start server
ensureAdminExists().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
