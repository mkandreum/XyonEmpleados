const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const authController = require('./controllers/authController');
const payrollController = require('./controllers/payrollController');
const vacationController = require('./controllers/vacationController');
const commonController = require('./controllers/commonController');

// Auth
const adminController = require('./controllers/adminController');
const contentController = require('./controllers/contentController');
const { isAdmin } = require('./middleware/auth');

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected Routes
router.use(authenticateToken);

// Admin Routes
router.get('/admin/users', isAdmin, adminController.getUsers);
router.post('/admin/users', isAdmin, adminController.createUser);
router.put('/admin/users/:id', isAdmin, adminController.updateUser);
router.delete('/admin/users/:id', isAdmin, adminController.deleteUser);
router.get('/admin/vacations', isAdmin, adminController.getAllVacations);
router.put('/admin/vacations/:id/status', isAdmin, adminController.updateVacationStatus);
router.get('/admin/settings', isAdmin, adminController.getSettings);
router.put('/admin/settings', isAdmin, adminController.updateSettings);

// Admin Content Management
router.post('/admin/news', isAdmin, contentController.createNews);
router.put('/admin/news/:id', isAdmin, contentController.updateNews);
router.delete('/admin/news/:id', isAdmin, contentController.deleteNews);
router.post('/admin/payrolls', isAdmin, contentController.createPayroll);
router.post('/admin/events', isAdmin, contentController.createEvent);

// Public/Employee Routes
router.get('/events', contentController.getAllEvents);
router.get('/holidays/next', contentController.getNextHoliday);

// User
router.get('/users/profile', authController.getProfile);
router.put('/users/profile', authController.updateProfile);

// Payrolls
router.get('/payrolls', payrollController.getAllPayrolls);

// Vacations
router.get('/vacations', vacationController.getAllVacations);
router.post('/vacations', vacationController.createVacation);

// News
router.get('/news', commonController.getAllNews);

// Notifications
router.get('/notifications', commonController.getAllNotifications);
router.put('/notifications/:id/read', commonController.markNotificationRead);

module.exports = router;
