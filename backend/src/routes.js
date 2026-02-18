const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const authController = require('./controllers/authController');
const payrollController = require('./controllers/payrollController');
const vacationController = require('./controllers/vacationController');
const commonController = require('./controllers/commonController');
const adminController = require('./controllers/adminController');
const contentController = require('./controllers/contentController');
const uploadController = require('./controllers/uploadController');
const benefitsController = require('./controllers/benefitsController');
const statsController = require('./controllers/statsController');
const notificationController = require('./controllers/notificationController');
const fichajeController = require('./controllers/fichajeController');
const scheduleController = require('./controllers/scheduleController');
const lateNotificationController = require('./controllers/lateNotificationController');
const fileController = require('./controllers/fileController');
const emailTemplateController = require('./controllers/emailTemplateController');
const pushController = require('./controllers/pushController');
const { isAdmin } = require('./middleware/auth');
const { validate, loginSchema, registerSchema, changePasswordSchema, updateProfileSchema, vacationRequestSchema } = require('./middleware/validation');

// Import auth rate limiter from server
const { authLimiter } = require('./server');


// ========================================
// HEALTH CHECK (Docker - no auth required)
// ========================================
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// BUILD VERSION (public, no auth - used by frontend to detect new deploys)
router.get('/version', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    // Read version from version.json written at build time
    const fs = require('fs');
    const path = require('path');
    try {
        const versionFile = path.join(__dirname, '../version.json');
        if (fs.existsSync(versionFile)) {
            const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
            return res.json(data);
        }
    } catch (e) { /* ignore */ }
    res.json({ version: 'unknown', buildTime: new Date().toISOString() });
});


// Public Routes (NO AUTH REQUIRED)
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);

// Public endpoint for logo only (secure alternative to exposing all settings)
router.get('/public/logo', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const logoSetting = await prisma.globalSettings.findUnique({
            where: { key: 'logoUrl' }
        });

        const adminLogoSetting = await prisma.globalSettings.findUnique({
            where: { key: 'adminLogoUrl' }
        });

        const companySetting = await prisma.globalSettings.findUnique({
            where: { key: 'companyName' }
        });

        const departmentsSetting = await prisma.globalSettings.findUnique({
            where: { key: 'DEPARTMENTS' }
        });

        let departments = ['General'];
        if (departmentsSetting?.value) {
            try {
                const parsed = JSON.parse(departmentsSetting.value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    departments = parsed;
                }
            } catch (parseError) {
                console.error('Error parsing departments setting:', parseError);
            }
        }

        res.json({
            logoUrl: logoSetting?.value || '/default-logo.png',
            adminLogoUrl: adminLogoSetting?.value || '/default-logo.png',
            companyName: companySetting?.value || 'XyonEmpleados',
            departments
        });
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.status(500).json({ error: 'Failed to fetch public settings' });
    }
});

router.get('/events', contentController.getAllEvents);
router.get('/holidays/next', contentController.getNextHoliday);

// Protected Routes (AUTH REQUIRED)
router.use(authenticateToken);

// Push Notifications (requires auth)
router.get('/push/public-key', pushController.getVapidPublicKey);
router.post('/push/subscriptions', pushController.saveSubscription);
router.delete('/push/subscriptions', pushController.deleteSubscription);

// Stats Routes
router.get('/admin/stats', isAdmin, statsController.getAdminStats);

// Upload Routes
router.post('/upload/logo', isAdmin, uploadController.uploadLogo, uploadController.handleUpload);
router.post('/upload/payroll', isAdmin, uploadController.uploadPayroll, uploadController.handleUpload);
router.post('/upload/justification', uploadController.uploadJustification, uploadController.handleUpload);
router.post('/upload/avatar', uploadController.uploadAvatar, uploadController.handleUpload);
router.post('/upload/news', isAdmin, uploadController.uploadNewsImage, uploadController.handleUpload);
router.delete('/upload/file', uploadController.deleteFile);

// Secure File Access
router.get('/files/:type/:filename', fileController.getFile);

// Benefits Routes
router.get('/benefits/user', benefitsController.getUserBenefitsBalance);
router.get('/benefits/department/:department', benefitsController.getBenefitsByDepartment);
router.get('/admin/benefits', isAdmin, benefitsController.getDepartmentBenefits);
router.post('/admin/benefits', isAdmin, benefitsController.upsertDepartmentBenefits);
router.put('/admin/benefits/balance', isAdmin, benefitsController.updateUserBalance);

// Admin Routes
router.get('/admin/users', isAdmin, adminController.getUsers);
router.post('/admin/users', isAdmin, adminController.createUser);
router.put('/admin/users/:id', isAdmin, adminController.updateUser);
router.delete('/admin/users/:id', isAdmin, adminController.deleteUser);
router.post('/admin/users/bulk', isAdmin, adminController.importUsers);
router.get('/admin/vacations', isAdmin, adminController.getAllVacations);
router.put('/admin/vacations/:id/status', isAdmin, adminController.updateVacationStatus);
router.get('/admin/settings', isAdmin, adminController.getSettings); // Protected - Admin only
router.put('/admin/settings', isAdmin, adminController.updateSettings);

// Admin - Invites
router.get('/admin/invites', isAdmin, adminController.getInviteCodes);
router.post('/admin/invites', isAdmin, adminController.generateInviteCode);
router.delete('/admin/invites/:id', isAdmin, adminController.revokeInviteCode);

// Admin - Email Templates
router.get('/admin/email-templates', isAdmin, emailTemplateController.getAll);
router.get('/admin/email-templates/:id', isAdmin, emailTemplateController.getById);
router.put('/admin/email-templates/:id', isAdmin, emailTemplateController.update);
router.post('/admin/email-templates/preview', isAdmin, emailTemplateController.preview);

// Admin Content Management
router.post('/admin/news', isAdmin, contentController.createNews);
router.put('/admin/news/:id', isAdmin, contentController.updateNews);
router.delete('/admin/news/:id', isAdmin, contentController.deleteNews);
router.post('/admin/payrolls', isAdmin, contentController.createPayroll);
router.post('/admin/events', isAdmin, contentController.createEvent);
router.delete('/admin/events/:id', isAdmin, contentController.deleteEvent);
router.get('/admin/payrolls', isAdmin, adminController.getAllPayrolls);
router.delete('/admin/payrolls/:id', isAdmin, adminController.deletePayroll);


// User
router.get('/users/profile', authController.getProfile);
router.put('/users/profile', validate(updateProfileSchema), authController.updateProfile);
router.post('/users/change-password', validate(changePasswordSchema), authController.changePassword);

// Payrolls
router.get('/payrolls', payrollController.getAllPayrolls);
router.put('/payrolls/:id/signed', payrollController.uploadSignedPayroll);
router.get('/payrolls/:id/download', payrollController.downloadPayroll);

// Vacations
router.get('/vacations', vacationController.getAllVacations);
router.post('/vacations', validate(vacationRequestSchema), vacationController.createVacation);
router.patch('/vacations/:id/justification', vacationController.updateJustification);

// Manager routes (protected - requires MANAGER role)
router.get('/manager/team-vacations', vacationController.getTeamVacations);
router.patch('/manager/vacations/:id/approve', vacationController.managerApproveVacation);
router.patch('/manager/vacations/:id/reject', vacationController.managerRejectVacation);

// News
router.get('/news', commonController.getAllNews);

// Notifications
// Notifications
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);
router.put('/notifications/read-all', notificationController.markAllAsRead);

// Fichajes Routes
router.post('/fichajes', fichajeController.createFichaje);
router.get('/fichajes/current', fichajeController.getCurrentFichaje);
router.get('/fichajes/history', fichajeController.getHistory);
router.get('/fichajes/report', fichajeController.getAttendanceReport);
router.get('/fichajes/week/:userId', fichajeController.getWeek);
router.get('/fichajes/month/:userId', fichajeController.getMonth);
router.get('/fichajes/department/:dept/week', fichajeController.getDepartmentWeek);

// Department Schedules Routes
router.get('/department-schedules/:department', scheduleController.getSchedule);
router.get('/department-schedules', isAdmin, scheduleController.getAllSchedules);
router.post('/department-schedules', isAdmin, scheduleController.upsertSchedule);

// Late Arrival Notifications Routes
router.post('/late-notifications', lateNotificationController.createLateNotification);
router.get('/late-notifications', lateNotificationController.getLateNotifications);
router.get('/late-notifications/sent', lateNotificationController.getSentNotifications);
router.post('/late-notifications/:id/justify', lateNotificationController.justifyLateArrival);
router.put('/late-notifications/:id/read', lateNotificationController.markAsRead);

module.exports = router;

