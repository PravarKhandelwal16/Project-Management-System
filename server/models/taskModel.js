const { pool } = require('../config/db');
const { projectScope, hasPermission } = require('../services/accessService');
const { validateTaskSort } = require('../utils/validation');

/**
 * Task Model - database operations for tasks table
 */

/**
 * Create a new task
 * @param {object} taskData
 * @returns {Promise<number>} Inserted task ID
 */
const createTask = async ({
  project_id,
  assigned_to = null,
  created_by,
  name,
  description = null,
  priority = 'Medium',
  status = 'Pending',
  due_date = null,
}) => {
  const sql = `
    INSERT INTO tasks (project_id, user_id, created_by, name, description, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    project_id,
    assigned_to || null,
    created_by,
    name.trim(),
    description ? description.trim() : null,
    priority || 'Medium',
    status || 'Pending',
    due_date || null,
  ]);
  return result.insertId;
};

/**
 * Get task by ID with project, assignee, and creator metadata
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
const getTaskById = async (id) => {
  const sql = `
    SELECT 
      t.id,
      t.project_id,
      t.user_id as assigned_to,
      t.created_by,
      t.name,
      t.description,
      t.priority,
      t.status,
      DATE_FORMAT(t.due_date, '%Y-%m-%d') as due_date,
      t.created_at,
      t.updated_at,
      p.name as project_name,
      p.user_id as project_owner_id,
      assignee.full_name as assignee_name,
      assignee.email as assignee_email,
      assignee.role as assignee_role,
      creator.full_name as creator_name,
      creator.email as creator_email
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users assignee ON t.user_id = assignee.id
    LEFT JOIN users creator ON t.created_by = creator.id
    WHERE t.id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * List tasks accessible to user with search, filter, and sorting
 * @param {object} user Authenticated user
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
const getAccessibleTasks = async (
  user,
  {
    project_id = '',
    assigned_to = '',
    status = '',
    priority = '',
    search = '',
    sortBy = 'created_at',
    order = 'DESC',
  } = {}
) => {
  const { sortBy: cleanSortBy, sortOrder: cleanSortOrder } = validateTaskSort(sortBy, order);

  let sql = `
    SELECT 
      t.id,
      t.project_id,
      t.user_id as assigned_to,
      t.created_by,
      t.name,
      t.description,
      t.priority,
      t.status,
      DATE_FORMAT(t.due_date, '%Y-%m-%d') as due_date,
      t.created_at,
      t.updated_at,
      p.name as project_name,
      p.user_id as project_owner_id,
      assignee.full_name as assignee_name,
      assignee.email as assignee_email,
      creator.full_name as creator_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users assignee ON t.user_id = assignee.id
    LEFT JOIN users creator ON t.created_by = creator.id
    WHERE 1=1
  `;

  const scope = projectScope(user);
  const params = [...scope.params];
  sql += ' AND ' + scope.sql;
  if (!hasPermission(user, 'tasks.view')) sql += ' AND 0=1';

  // Filters
  if (project_id) {
    sql += ` AND t.project_id = ?`;
    params.push(project_id);
  }

  if (assigned_to) {
    sql += ` AND t.user_id = ?`;
    params.push(assigned_to);
  }

  if (status) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  if (priority) {
    sql += ` AND t.priority = ?`;
    params.push(priority);
  }

  if (search && search.trim()) {
    sql += ` AND (t.name LIKE ? OR t.description LIKE ?)`;
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  // Sorting
  sql += ` ORDER BY t.${cleanSortBy} ${cleanSortOrder}`;

  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Update task details (name, description, priority, status, due_date, assigned_to)
 * @param {number|string} id
 * @param {object} updateData
 * @returns {Promise<boolean>}
 */
const updateTask = async (id, { name, description, priority, status, due_date, assigned_to }) => {
  const sql = `
    UPDATE tasks
    SET 
      name = ?,
      description = ?,
      priority = ?,
      status = ?,
      due_date = ?,
      user_id = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [
    name.trim(),
    description !== undefined ? (description ? description.trim() : null) : null,
    priority,
    status,
    due_date || null,
    assigned_to || null,
    id,
  ]);
  return result.affectedRows > 0;
};

/**
 * Update only task status
 * @param {number|string} id
 * @param {string} status
 * @returns {Promise<boolean>}
 */
const updateTaskStatus = async (id, status) => {
  const sql = `
    UPDATE tasks
    SET status = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [status, id]);
  return result.affectedRows > 0;
};

/**
 * Update only task priority
 * @param {number|string} id
 * @param {string} priority
 * @returns {Promise<boolean>}
 */
const updateTaskPriority = async (id, priority) => {
  const sql = `
    UPDATE tasks
    SET priority = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [priority, id]);
  return result.affectedRows > 0;
};

/**
 * Update only task assignee
 * @param {number|string} id
 * @param {number|null} userId
 * @returns {Promise<boolean>}
 */
const updateTaskAssignee = async (id, userId) => {
  const sql = `
    UPDATE tasks
    SET user_id = ?
    WHERE id = ? AND NOT (user_id <=> ?)
  `;
  const [result] = await pool.execute(sql, [userId || null, id, userId || null]);
  return result.affectedRows > 0;
};

/**
 * Delete a task
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
const deleteTask = async (id) => {
  const sql = `DELETE FROM tasks WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createTask,
  getTaskById,
  getAccessibleTasks,
  updateTask,
  updateTaskStatus,
  updateTaskPriority,
  updateTaskAssignee,
  deleteTask,
};
