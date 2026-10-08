const { pool } = require('../config/db');

/**
 * User Model - handles database interactions for users table
 */

/**
 * Find user by email (includes password_hash for authentication)
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const findByEmail = async (email) => {
  const sql = `
    SELECT id, full_name, email, password_hash, role, is_active, department, job_title, permission_overrides, created_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [email.trim().toLowerCase()]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Find user by ID (excludes password_hash for safety)
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
const findById = async (id) => {
  const sql = `
    SELECT id, full_name, email, role, is_active, department, job_title, permission_overrides, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Create a new user record
 * @param {object} userData
 * @param {string} userData.full_name
 * @param {string} userData.email
 * @param {string} userData.password_hash
 * @param {string} [userData.role='member']
 * @param {boolean|number} [userData.is_active=1]
 * @returns {Promise<number>} Inserted user ID
 */
const createUser = async ({ full_name, email, password_hash, role = 'member', is_active = 1 }) => {
  const sql = `
    INSERT INTO users (full_name, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    full_name.trim(),
    email.trim().toLowerCase(),
    password_hash,
    role,
    is_active ? 1 : 0,
  ]);
  return result.insertId;
};

/**
 * Find all users with optional filtering and search (for admin management)
 * @param {object} [filters]
 * @param {string} [filters.search]
 * @param {string} [filters.role]
 * @param {string|number|boolean} [filters.is_active]
 * @returns {Promise<Array<object>>}
 */
const findAll = async ({ search = '', role = '', is_active = '', page = 1, limit = 25 } = {}) => {
  let sql = `
    SELECT id, full_name, email, role, is_active, department, job_title, permission_overrides, created_at, updated_at
    FROM users
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim()) {
    sql += ` AND (full_name LIKE ? OR email LIKE ? OR department LIKE ? OR job_title LIKE ?)`;
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (role && role.trim()) {
    sql += ` AND role = ?`;
    params.push(role.trim());
  }

  if (is_active !== '' && is_active !== undefined && is_active !== null) {
    const activeVal = is_active === true || is_active === 'true' || is_active === 1 || is_active === '1' ? 1 : 0;
    sql += ` AND is_active = ?`;
    params.push(activeVal);
  }

  const countSql = 'SELECT COUNT(*) AS total FROM users WHERE' + sql.split('WHERE')[1];
  const [counts] = await pool.execute(countSql, params);
  sql += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
  const [rows] = await pool.query(sql, [...params, limit, (page - 1) * limit]);
  return { data: rows, total: Number(counts[0].total) };
};

/**
 * Count active super admins (to prevent demoting or deactivating the last one)
 * @returns {Promise<number>}
 */
const countActiveSuperAdmins = async () => {
  const sql = `
    SELECT COUNT(*) as count
    FROM users
    WHERE role = 'super_admin' AND is_active = 1
  `;
  const [rows] = await pool.execute(sql);
  return rows[0].count;
};

/**
 * Update user role
 * @param {number|string} userId
 * @param {string} newRole
 * @returns {Promise<boolean>}
 */
const updateRole = async (userId, newRole) => {
  const sql = `
    UPDATE users
    SET role = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [newRole, userId]);
  return result.affectedRows > 0;
};

/**
 * Update user active status
 * @param {number|string} userId
 * @param {boolean|number} isActive
 * @returns {Promise<boolean>}
 */
const updateStatus = async (userId, isActive) => {
  const sql = `
    UPDATE users
    SET is_active = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [isActive ? 1 : 0, userId]);
  return result.affectedRows > 0;
};

module.exports = {
  findByEmail,
  findById,
  createUser,
  findAll,
  countActiveSuperAdmins,
  updateRole,
  updateStatus,
};
