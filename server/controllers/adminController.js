const userModel = require('../models/userModel');
const { pool } = require('../config/db');
const { ROLES } = require('../utils/roles');
const { validateRole } = require('../utils/validation');
const { logAuditEvent } = require('../services/auditService');

/**
 * Controller for Administrative User Management & System Stats
 */

/**
 * List all users with search and filter
 * GET /api/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { search, role, is_active } = req.query;
    const users = await userModel.findAll({ search, role, is_active });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const user = await userModel.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role
 * PATCH /api/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const { role: newRole } = req.body;
    const actor = req.user;

    // 1. Validate role input
    const roleValidation = validateRole(newRole);
    if (!roleValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: roleValidation.error,
      });
    }

    // 2. Fetch target user
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // No-op check
    if (targetUser.role === newRole) {
      return res.status(200).json({
        success: true,
        message: 'User already has this role',
        data: targetUser,
      });
    }

    // 3. Admin restrictions (Admin is limited)
    if (actor.role === ROLES.ADMIN) {
      // Cannot modify a Super Admin
      if (targetUser.role === ROLES.SUPER_ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admins cannot modify Super Admin accounts.',
        });
      }

      // Cannot assign Super Admin or Admin roles
      if (newRole === ROLES.SUPER_ADMIN || newRole === ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admins cannot grant Super Admin or Admin privileges.',
        });
      }

      // Cannot change own role (self-escalation / self-modification prevention)
      if (actor.id === targetUserId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admins cannot modify their own role.',
        });
      }
    }

    // 4. Last Super Admin protection
    if (targetUser.role === ROLES.SUPER_ADMIN && newRole !== ROLES.SUPER_ADMIN) {
      const activeSuperAdmins = await userModel.countActiveSuperAdmins();
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Operation rejected: Cannot demote the last active Super Admin account.',
        });
      }
    }

    // 5. Update role in database
    await userModel.updateRole(targetUserId, newRole);

    // 6. Audit log
    await logAuditEvent({
      userId: actor.id,
      action: 'USER_ROLE_UPDATED',
      resourceType: 'USER',
      resourceId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        oldRole: targetUser.role,
        newRole,
        changedBy: actor.id,
      },
    });

    const updatedUser = await userModel.findById(targetUserId);

    return res.status(200).json({
      success: true,
      message: `User role updated successfully to ${newRole}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user activation status
 * PATCH /api/admin/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const { is_active } = req.body;
    const actor = req.user;

    if (is_active === undefined || typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. is_active must be a boolean (true or false).',
      });
    }

    // 1. Fetch target user
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
      });
    }

    // 2. Admin restrictions
    if (actor.role === ROLES.ADMIN) {
      if (targetUser.role === ROLES.SUPER_ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admins cannot deactivate Super Admin accounts.',
        });
      }
      if (actor.id === targetUserId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admins cannot deactivate their own account.',
        });
      }
    }

    // 3. Last Super Admin protection
    if (targetUser.role === ROLES.SUPER_ADMIN && !is_active) {
      const activeSuperAdmins = await userModel.countActiveSuperAdmins();
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Operation rejected: Cannot deactivate the last active Super Admin account.',
        });
      }
    }

    // 4. Update status in database
    await userModel.updateStatus(targetUserId, is_active);

    // 5. Audit log
    await logAuditEvent({
      userId: actor.id,
      action: 'USER_STATUS_UPDATED',
      resourceType: 'USER',
      resourceId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        oldStatus: !!targetUser.is_active,
        newStatus: is_active,
        changedBy: actor.id,
      },
    });

    const updatedUser = await userModel.findById(targetUserId);

    return res.status(200).json({
      success: true,
      message: `User account ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system-wide statistics for Super Admin and Admin
 * GET /api/admin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    // 1. User metrics
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users,
        SUM(CASE WHEN role = '${ROLES.SUPER_ADMIN}' THEN 1 ELSE 0 END) as super_admins,
        SUM(CASE WHEN role = '${ROLES.ADMIN}' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = '${ROLES.PROJECT_MANAGER}' THEN 1 ELSE 0 END) as project_managers,
        SUM(CASE WHEN role = '${ROLES.MEMBER}' THEN 1 ELSE 0 END) as members
      FROM users
    `);

    // 2. Project metrics
    const [projectStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'Not Started' THEN 1 ELSE 0 END) as not_started,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM projects
    `);

    return res.status(200).json({
      success: true,
      data: {
        users: userStats[0],
        projects: projectStats[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  getSystemStats,
};
