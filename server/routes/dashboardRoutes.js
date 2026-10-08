const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard statistics, charts, and recent activity (scoped by role)
 * @access  Private
 */
router.get('/', dashboardController.getDashboardData);

module.exports = router;
