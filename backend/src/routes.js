const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const authController = require('./controllers/authController');
const payrollController = require('./controllers/payrollController');
const vacationController = require('./controllers/vacationController');
const commonController = require('./controllers/commonController');

// Auth
router.post('/auth/login', authController.login);

// Protected Routes
router.use(authenticateToken);

// User
router.get('/users/profile', authController.getProfile);

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
