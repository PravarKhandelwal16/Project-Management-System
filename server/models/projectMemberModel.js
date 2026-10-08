const { pool } = require('../config/db');

/**
 * Project Member Model - database operations for project_members table
 */

/**
 * Get all members belonging to a project
 * @param {number|string} projectId
 * @returns {Promise<Array<object>>}
 */
const getMembersByProjectId = async (projectId) => {
  const sql = `
    SELECT 
      pm.id,
      pm.project_id,
      pm.user_id,
      pm.added_by,
      pm.created_at as joined_at,
      u.full_name,
      u.email,
      u.role,
      u.is_active,
      adder.full_name as added_by_name
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    LEFT JOIN users adder ON pm.added_by = adder.id
    WHERE pm.project_id = ?
    ORDER BY pm.created_at ASC
  `;
  const [rows] = await pool.execute(sql, [projectId]);
  return rows;
};

/**
 * Check if a user is already a member of a project
 * @param {number|string} projectId
 * @param {number|string} userId
 * @returns {Promise<boolean>}
 */
const isMember = async (projectId, userId) => {
  const sql = `
    SELECT id FROM project_members
    WHERE project_id = ? AND user_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [projectId, userId]);
  return rows.length > 0;
};

/**
 * Add a member to a project
 * @param {object} data
 * @param {number|string} data.projectId
 * @param {number|string} data.userId
 * @param {number|string} data.addedBy
 * @returns {Promise<number>} Inserted member ID
 */
const addMember = async ({ projectId, userId, addedBy }) => {
  const sql = `
    INSERT INTO project_members (project_id, user_id, added_by)
    VALUES (?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [projectId, userId, addedBy]);
  return result.insertId;
};

/**
 * Remove a member from a project
 * @param {number|string} projectId
 * @param {number|string} userId
 * @returns {Promise<boolean>}
 */
const removeMember = async (projectId, userId) => {
  const sql = `
    DELETE FROM project_members
    WHERE project_id = ? AND user_id = ?
  `;
  const [result] = await pool.execute(sql, [projectId, userId]);
  return result.affectedRows > 0;
};

module.exports = {
  getMembersByProjectId,
  isMember,
  addMember,
  removeMember,
};
