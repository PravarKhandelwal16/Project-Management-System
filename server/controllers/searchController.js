const { pool } = require('../config/db');
const { ROLES } = require('../utils/roles');

/**
 * Global Search
 * GET /api/search?q=keyword
 */
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: { projects: [], tasks: [], users: [] }
      });
    }

    const keyword = `%${q.trim()}%`;
    const user = req.user;

    // Base WHERE clauses for RBAC
    let projectWhere = '(name LIKE ? OR description LIKE ?)';
    let projectParams = [keyword, keyword];
    
    let taskWhere = '(t.name LIKE ? OR t.description LIKE ?)';
    let taskParams = [keyword, keyword];

    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      // Full access
    } else if (user.role === ROLES.PROJECT_MANAGER) {
      projectWhere += ' AND user_id = ?';
      projectParams.push(user.id);
      
      taskWhere += ` AND t.project_id IN (SELECT id FROM projects WHERE user_id = ?)`;
      taskParams.push(user.id);
    } else {
      projectWhere += ` AND id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;
      projectParams.push(user.id);
      
      taskWhere += ` AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;
      taskParams.push(user.id);
    }

    const [projects] = await pool.query(
      `SELECT id, name, status, 'project' as type FROM projects WHERE ${projectWhere} LIMIT 5`,
      projectParams
    );

    const [tasks] = await pool.query(
      `SELECT t.id, t.name, t.status, p.name as project_name, 'task' as type 
       FROM tasks t JOIN projects p ON t.project_id = p.id 
       WHERE ${taskWhere} LIMIT 5`,
      taskParams
    );

    let users = [];
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      const [userRows] = await pool.query(
        `SELECT id, full_name as name, role, 'user' as type FROM users WHERE full_name LIKE ? OR email LIKE ? LIMIT 5`,
        [keyword, keyword]
      );
      users = userRows;
    }

    return res.status(200).json({
      success: true,
      data: {
        projects,
        tasks,
        users
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch
};
