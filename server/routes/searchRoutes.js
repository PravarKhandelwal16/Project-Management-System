const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

// All search routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/search
 * @desc    Global search across projects and tasks
 * @access  Private
 */
router.get('/', searchController.globalSearch);

module.exports = router;
