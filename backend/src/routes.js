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
const { isAdmin } = require('./middleware/auth');

// Public Routes (NO AUTH REQUIRED)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/admin/settings', adminController.getSettings); // Public for logo loading
router.get('/events', contentController.getAllEvents);
router.get('/holidays/next', contentController.getNextHoliday);

// Protected Routes (AUTH REQUIRED)
router.use(authenticateToken);

// Stats Routes
router.get('/admin/stats', isAdmin, statsController.getAdminStats);

// Upload Routes
router.post('/upload/logo', isAdmin, uploadController.uploadLogo, uploadController.handleUpload);
router.post('/upload/payroll', isAdmin, uploadController.uploadPayroll, uploadController.handleUpload);
router.post('/upload/justification', uploadController.uploadJustification, uploadController.handleUpload);
router.post('/upload/avatar', uploadController.uploadAvatar, uploadController.handleUpload);
router.delete('/upload/file', uploadController.deleteFile);

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
router.put('/admin/settings', isAdmin, adminController.updateSettings);

// Admin Content Management
router.post('/admin/news', isAdmin, contentController.createNews);
router.put('/admin/news/:id', isAdmin, contentController.updateNews);
router.delete('/admin/news/:id', isAdmin, contentController.deleteNews);
router.post('/admin/payrolls', isAdmin, contentController.createPayroll);
router.post('/admin/events', isAdmin, contentController.createEvent);
router.delete('/admin/events/:id', isAdmin, contentController.deleteEvent);

// User
router.get('/users/profile', authController.getProfile);
router.put('/users/profile', authController.updateProfile);
router.post('/users/change-password', authController.changePassword);

// Payrolls
router.get('/payrolls', payrollController.getAllPayrolls);

// Vacations
router.get('/vacations', vacationController.getAllVacations);
router.post('/vacations', vacationController.createVacation);

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

module.exports = router;
