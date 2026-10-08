const { ROLES } = require('../utils/roles');
const { pool } = require('../config/db');

/**
 * Authorize users based on permitted roles
 * @param {...string} allowedRoles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to perform this action.',
      });
    }

    next();
  };
};

/**
 * Project-level authorization middleware
 * Checks if the user can either 'view' or 'manage' the project specified in req.params.id
 * Attaches req.project for downstream handler usage
 * @param {'view'|'manage'} action
 */
const requireProjectAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;

      if (!projectId || isNaN(Number(projectId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }

      // 1. Fetch project record
      const [projects] = await pool.execute(
        `SELECT p.*, u.full_name as owner_name, u.email as owner_email
         FROM projects p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ? LIMIT 1`,
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      const project = projects[0];
      const user = req.user;

      // 2. Super Admin and Admin have universal project view & management access
      if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
        req.project = project;
        return next();
      }

      const isOwner = project.user_id === user.id;

      // 3. For 'manage' (edit, delete, add/remove members)
      if (action === 'manage') {
        if (isOwner && user.role === ROLES.PROJECT_MANAGER) {
          req.project = project;
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the project manager (owner) or an administrator can manage this project.',
        });
      }

      // 4. For 'view'
      if (isOwner) {
        req.project = project;
        return next();
      }

      // Check if user is an assigned member in project_members
      const [memberships] = await pool.execute(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
        [projectId, user.id]
      );

      if (memberships.length > 0) {
        req.project = project;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this project.',
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authorizeRoles,
  requireProjectAccess,
};
