const { pool } = require('../config/db');

/**
 * Audit Model - handles database interactions for audit_logs table
 */

/**
 * Insert an audit log entry
 * @param {object} logData
 * @param {number|null} logData.userId - User ID who triggered the action
 * @param {string} logData.action - Action name (e.g. USER_REGISTERED, USER_LOGIN)
 * @param {string} logData.resourceType - Resource type (e.g. USER, PROJECT, TASK)
 * @param {number|null} logData.resourceId - Resource ID
 * @param {string|null} [logData.details] - Serialized JSON or description string
 * @returns {Promise<number>} Inserted log ID
 */
const createAuditLog = async ({
  userId = null,
  action,
  resourceType,
  resourceId = null,
  details = null,
}) => {
  const sql = `
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (?, ?, ?, ?, ?)
  `;

  const detailsValue = typeof details === 'object' ? JSON.stringify(details) : details;

  const [result] = await pool.execute(sql, [
    userId,
    action,
    resourceType,
    resourceId,
    detailsValue,
  ]);

  return result.insertId;
};

module.exports = {
  createAuditLog,
};
