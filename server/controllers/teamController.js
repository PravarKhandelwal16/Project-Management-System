const { pool } = require('../config/db');
const { hasPermission } = require('../services/accessService');
const roster = async (req, res, next) => {
  try {
    const project = req.project;
    const [rows] = await pool.query(`SELECT u.id AS user_id, u.full_name, u.email, u.role, u.department, u.job_title, u.is_active,
      (u.id = ?) AS is_owner, pm.created_at AS joined_at,
      COUNT(t.id) AS assigned_tasks, SUM(t.status != 'Completed') AS open_tasks,
      SUM(t.status != 'Completed' AND t.due_date < CURDATE()) AS overdue_tasks
      FROM users u LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = ?
      LEFT JOIN tasks t ON t.user_id = u.id AND t.project_id = ?
      WHERE u.id = ? OR pm.id IS NOT NULL
      GROUP BY u.id, pm.created_at ORDER BY is_owner DESC, u.full_name`, [project.user_id, project.id, project.id, project.user_id]);
    res.json({ success: true, project, can_manage: hasPermission(req.user, 'team.manage'), data: rows.map(row => ({ ...row, assigned_tasks: hasPermission(req.user, 'tasks.view') ? Number(row.assigned_tasks) : null, open_tasks: hasPermission(req.user, 'tasks.view') ? Number(row.open_tasks || 0) : null, overdue_tasks: hasPermission(req.user, 'tasks.view') ? Number(row.overdue_tasks || 0) : null })) });
  } catch (error) { next(error); }
};
const candidates = async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const [rows] = await pool.query(`SELECT id, full_name, email, role, department, job_title FROM users
      WHERE is_active = 1 AND id != ? AND id NOT IN (SELECT user_id FROM project_members WHERE project_id = ?)
      AND (full_name LIKE ? OR email LIKE ?) ORDER BY full_name LIMIT 50`, [req.project.user_id, req.project.id, '%' + search + '%', '%' + search + '%']);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};
module.exports = { roster, candidates };
