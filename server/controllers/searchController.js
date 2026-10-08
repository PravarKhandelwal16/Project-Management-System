const projectModel = require('../models/projectModel');
const taskModel = require('../models/taskModel');
const { pool } = require('../config/db');
const { hasPermission } = require('../services/accessService');
const globalSearch = async (req, res, next) => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!search) return res.json({ success: true, data: { projects: [], tasks: [], users: [] } });
    const projects = hasPermission(req.user, 'projects.view') ? (await projectModel.getAccessibleProjects(req.user, { search })).slice(0, 5).map(item => ({ id: item.id, name: item.name, status: item.status, type: 'project' })) : [];
    const tasks = hasPermission(req.user, 'tasks.view') ? (await taskModel.getAccessibleTasks(req.user, { search })).slice(0, 5).map(item => ({ id: item.id, name: item.name, status: item.status, project_name: item.project_name, type: 'task' })) : [];
    let users = [];
    if (hasPermission(req.user, 'users.view')) [users] = await pool.execute("SELECT id, full_name AS name, role, 'user' AS type FROM users WHERE full_name LIKE ? OR email LIKE ? LIMIT 5", ['%' + search + '%', '%' + search + '%']);
    res.json({ success: true, data: { projects, tasks, users } });
  } catch (error) { next(error); }
};
module.exports = { globalSearch };
