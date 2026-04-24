const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/social-sync', authController.socialSync);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', auth, authController.getProfile);

module.exports = router;