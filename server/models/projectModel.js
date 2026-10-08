const { pool } = require('../config/db');
const { projectScope, hasPermission } = require('../services/accessService');
const { validateProjectSort } = require('../utils/validation');

/**
 * Project Model - database operations for projects table
 */

/**
 * Create a new project
 * @param {object} projectData
 * @param {number} projectData.user_id Owner ID
 * @param {string} projectData.name
 * @param {string} [projectData.description]
 * @param {string} [projectData.status='Not Started']
 * @param {string|null} [projectData.start_date]
 * @param {string|null} [projectData.end_date]
 * @returns {Promise<number>} Inserted project ID
 */
const createProject = async ({
  user_id,
  name,
  description = null,
  status = 'Not Started',
  start_date = null,
  end_date = null,
}) => {
  const sql = `
    INSERT INTO projects (user_id, name, description, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    user_id,
    name.trim(),
    description ? description.trim() : null,
    status,
    start_date || null,
    end_date || null,
  ]);
  return result.insertId;
};

/**
 * Find project by ID with owner information and member count
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
const getProjectById = async (id) => {
  const sql = `
    SELECT 
      p.id,
      p.user_id,
      p.name,
      p.description,
      p.status,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date,
      p.created_at,
      p.updated_at,
      u.full_name as owner_name,
      u.email as owner_email,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
    FROM projects p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * List projects accessible to the specified user with search, filter, and sorting
 * @param {object} user Authenticated user
 * @param {object} [options]
 * @param {string} [options.search]
 * @param {string} [options.status]
 * @param {string} [options.sortBy]
 * @param {string} [options.sortOrder]
 * @returns {Promise<Array<object>>}
 */
const getAccessibleProjects = async (user, { search = '', status = '', sortBy = 'created_at', sortOrder = 'DESC' } = {}) => {
  const { sortBy: cleanSortBy, sortOrder: cleanSortOrder } = validateProjectSort(sortBy, sortOrder);

  let sql = `
    SELECT 
      p.id,
      p.user_id,
      p.name,
      p.description,
      p.status,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') as start_date,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') as end_date,
      p.created_at,
      p.updated_at,
      u.full_name as owner_name,
      u.email as owner_email,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
      CASE WHEN p.user_id = ? THEN 1 ELSE 0 END as is_owner,
      ? as can_manage
    FROM projects p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;

  const scope = projectScope(user);
  const params = [user.id, hasPermission(user, 'projects.edit') ? 1 : 0, ...scope.params];
  sql += ' AND ' + scope.sql;

  // Search by project name
  if (search && search.trim()) {
    sql += ` AND p.name LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  // Filter by status
  if (status && status.trim()) {
    sql += ` AND p.status = ?`;
    params.push(status.trim());
  }

  // Safe sorting using allowlist
  sql += ` ORDER BY p.${cleanSortBy} ${cleanSortOrder}`;

  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Update project
 * @param {number|string} id
 * @param {object} updateData
 * @returns {Promise<boolean>}
 */
const updateProject = async (id, { name, description, status, start_date, end_date }) => {
  const sql = `
    UPDATE projects
    SET 
      name = ?,
      description = ?,
      status = ?,
      start_date = ?,
      end_date = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [
    name.trim(),
    description !== undefined ? (description ? description.trim() : null) : null,
    status || 'Not Started',
    start_date || null,
    end_date || null,
    id,
  ]);
  return result.affectedRows > 0;
};

/**
 * Delete project
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
const deleteProject = async (id) => {
  const sql = `DELETE FROM projects WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  createProject,
  getProjectById,
  getAccessibleProjects,
  updateProject,
  deleteProject,
};
