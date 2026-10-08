const {bodyFields}=require('../middleware/inputValidation');
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public (Rate limited)
 */
router.post('/register', authRateLimiter, bodyFields('full_name','email','password'), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public (Rate limited)
 */
router.post('/login', authRateLimiter, bodyFields('email','password'), authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Stateless logout acknowledgment
 * @access  Public
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user details
 * @access  Private (Protected by JWT)
 */
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
