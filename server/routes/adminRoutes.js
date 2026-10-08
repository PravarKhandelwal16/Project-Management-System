const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');
const { ADMIN_ROLES } = require('../utils/roles');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and Super Admin / Admin role
router.use(authenticateToken);
router.use(authorizeRoles(...ADMIN_ROLES));

/**
 * @route   GET /api/admin/users
 * @desc    List users with search and filters
 * @access  Private (Super Admin, Admin)
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user profile details
 * @access  Private (Super Admin, Admin)
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update user role with privilege rules
 * @access  Private (Super Admin, Admin)
 */
router.patch('/users/:id/role', adminController.updateUserRole);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Activate or deactivate user account
 * @access  Private (Super Admin, Admin)
 */
router.patch('/users/:id/status', adminController.updateUserStatus);

/**
 * @route   GET /api/admin/stats
 * @desc    Get system-wide overview statistics
 * @access  Private (Super Admin, Admin)
 */
router.get('/stats', adminController.getSystemStats);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Super Admin, Admin)
 */
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
