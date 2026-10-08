const { ROLES } = require('../utils/roles');
const { pool } = require('../config/db');
const taskModel = require('../models/taskModel');

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
 * Checks if the user can either 'view' or 'manage' the project specified in req.params.id / req.params.projectId
 * Attaches req.project for downstream handler usage
 * @param {'view'|'manage'} action
 */
const requireProjectAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId || req.body.project_id;

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

      // 3. For 'manage' (edit, delete, add/remove members, create tasks)
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

/**
 * Task-level authorization middleware
 * Checks if the user can either 'view', 'edit', 'delete', or 'status' the task specified in req.params.id
 * Attaches req.task for downstream handler usage
 * @param {'view'|'edit'|'delete'|'status'} action
 */
const requireTaskAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      const taskId = req.params.id || req.params.taskId;

      if (!taskId || isNaN(Number(taskId))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid task ID',
        });
      }

      const task = await taskModel.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      const user = req.user;
      req.task = task;

      // Super Admin: full access
      if (user.role === ROLES.SUPER_ADMIN) {
        return next();
      }

      // Admin: full access
      if (user.role === ROLES.ADMIN) {
        return next();
      }

      const isProjectOwner = task.project_owner_id === user.id;
      const isTaskAssignee = task.assigned_to === user.id;

      // Check if user is a member of the project
      const [memberships] = await pool.execute(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
        [task.project_id, user.id]
      );
      const isProjectMember = memberships.length > 0;

      // 1. DELETE
      if (action === 'delete') {
        if (isProjectOwner && user.role === ROLES.PROJECT_MANAGER) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to delete this task.',
        });
      }

      // 2. STATUS UPDATE
      if (action === 'status') {
        if (isProjectOwner && user.role === ROLES.PROJECT_MANAGER) {
          return next();
        }
        if (isTaskAssignee) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update the status of tasks assigned to you.',
        });
      }

      // 3. EDIT (Full Edit: name, description, priority, assignee, due_date, status)
      if (action === 'edit') {
        if (isProjectOwner && user.role === ROLES.PROJECT_MANAGER) {
          return next();
        }
        // If member is assigned to task, they can ONLY update status, not full task fields
        if (isTaskAssignee && user.role === ROLES.MEMBER) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Members can only update task status, not edit task details.',
          });
        }
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to edit this task.',
        });
      }

      // 4. VIEW
      if (isProjectOwner || isTaskAssignee || isProjectMember) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to view this task.',
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authorizeRoles,
  requireProjectAccess,
  requireTaskAccess,
};
