const projectModel = require('../models/projectModel');
const taskModel = require('../models/taskModel');
const { hasPermission, projectInScope } = require('../services/accessService');
const { logAuditEvent } = require('../services/auditService');
const deny = async (req, res) => {
  await logAuditEvent({ userId: req.user?.id || null, action: 'ACCESS_DENIED', resourceType: 'ACCESS', details: { method: req.method, path: req.originalUrl.split('?')[0] } });
  return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
};
const requirePermission = permission => (req, res, next) => hasPermission(req.user, permission) ? next() : deny(req, res);
const authorizeRoles = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : deny(req, res);
const requireProjectAccess = (action = 'view') => async (req, res, next) => {
  try {
    const id = Number(req.params.id || req.params.projectId || req.body.project_id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid project ID.' });
    const project = await projectModel.getProjectById(id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    const permission = { view: 'projects.view', manage: 'projects.edit', delete: 'projects.delete', members: 'team.manage', tasks: 'tasks.create' }[action];
    if (!hasPermission(req.user, 'projects.view') || !hasPermission(req.user, permission) || !await projectInScope(req.user, project)) return deny(req, res);
    req.project = project;
    next();
  } catch (error) { next(error); }
};
const requireTaskAccess = (action = 'view') => async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    const task = await taskModel.getTaskById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!hasPermission(req.user, 'projects.view') || !hasPermission(req.user, 'tasks.view') || !await projectInScope(req.user, { id: task.project_id, user_id: task.project_owner_id })) return deny(req, res);
    const permission = { view: 'tasks.view', edit: 'tasks.edit', assign: 'tasks.assign', delete: 'tasks.delete' }[action];
    const allowed = action === 'status' ? hasPermission(req.user, 'tasks.status') || (Number(task.assigned_to) === Number(req.user.id) && hasPermission(req.user, 'tasks.status_assigned')) : hasPermission(req.user, permission);
    if (!allowed) return deny(req, res);
    req.task = task;
    next();
  } catch (error) { next(error); }
};
module.exports = { requirePermission, authorizeRoles, requireProjectAccess, requireTaskAccess };
