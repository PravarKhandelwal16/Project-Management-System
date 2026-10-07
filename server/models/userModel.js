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
    SELECT id, full_name, email, password_hash, role, created_at, updated_at
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
    SELECT id, full_name, email, role, created_at, updated_at
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
 * @param {string} [userData.role='user']
 * @returns {Promise<number>} Inserted user ID
 */
const createUser = async ({ full_name, email, password_hash, role = 'user' }) => {
  const sql = `
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    full_name.trim(),
    email.trim().toLowerCase(),
    password_hash,
    role,
  ]);
  return result.insertId;
};

module.exports = {
  findByEmail,
  findById,
  createUser,
};
