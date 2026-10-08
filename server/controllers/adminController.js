const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const userModel = require('../models/userModel');
const { validateRegisterInput, validateFullName, validateEmail } = require('../utils/validation');
const { createAuditLog } = require('../models/auditModel');
const { catalog, resolveAccess, getRolePolicies, validatePermissions, canManageAccount, permissionKeys, administrativeKeys, hasPermission, parseJson } = require('../services/accessService');
function fail(status, message) { const error = new Error(message); error.statusCode = status; return error; }
function id(value) { const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < 1) throw fail(400, 'Invalid user ID.'); return parsed; }
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const requestedLimit = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) throw fail(400, 'Invalid pagination values.');
  return { page, limit: Math.min(100, requestedLimit) };
}
function profile(body) {
  for (const validation of [validateFullName(body.full_name), validateEmail(body.email)]) if (!validation.isValid) throw fail(400, validation.error);
  for (const key of ['department', 'job_title']) if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > 100)) throw fail(400, key + ' must be at most 100 characters.');
  return { full_name: body.full_name.trim(), email: body.email.trim().toLowerCase(), department: body.department?.trim() || null, job_title: body.job_title?.trim() || null };
}
async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize account security changes, including concurrent demotions/deactivations.
    await connection.query("SELECT id FROM users WHERE role = 'super_admin' ORDER BY id FOR UPDATE");
    const result = await work(connection);
    await connection.commit(); return result;
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
async function target(connection, req, nextRole) {
  const [rows] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [id(req.params.id)]);
  if (!rows.length) throw fail(404, 'User not found.');
  if (!canManageAccount(req.user, rows[0], nextRole || rows[0].role)) throw fail(403, 'You cannot modify your own account or an account at a protected administrator level.');
  return rows[0];
}
const getUsers = async (req, res, next) => {
  try {
    const { page, limit } = pagination(req.query);
    const users = await userModel.findAll({ ...req.query, page, limit });
    res.json({ success: true, ...users, page, limit });
  } catch (error) { next(error); }
};
const getUserById = async (req, res, next) => {
  try {
    const user = await userModel.findById(id(req.params.id));
    if (!user) throw fail(404, 'User not found.');
    res.json({ success: true, data: await resolveAccess(user) });
  } catch (error) { next(error); }
};
const createUser = async (req, res, next) => {
  try {
    const validation = validateRegisterInput(req.body);
    if (!validation.isValid) throw fail(400, validation.error);
    const data = profile(req.body), role = req.body.role || 'member';
    if (!catalog.roles.some(item => item.key === role)) throw fail(400, 'Invalid role.');
    if (role !== 'member' && !hasPermission(req.user, 'users.roles')) throw fail(403, 'Role assignment permission is required.');
    if (!canManageAccount(req.user, { id: 0, role }, role)) throw fail(403, 'You cannot create this administrator role.');
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const userId = await transaction(async connection => {
      const [result] = await connection.execute('INSERT INTO users (full_name, email, password_hash, role, department, job_title) VALUES (?, ?, ?, ?, ?, ?)', [data.full_name, data.email, passwordHash, role, data.department, data.job_title]);
      await createAuditLog({ userId: req.user.id, action: 'USER_CREATED', resourceType: 'USER', resourceId: result.insertId, details: { after: { ...data, role, is_active: true } } }, connection);
      return result.insertId;
    });
    res.status(201).json({ success: true, data: await userModel.findById(userId) });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') error = fail(409, 'This email address is already in use.'); next(error); }
};
const updateUser = async (req, res, next) => {
  try {
    const data = profile(req.body);
    await transaction(async connection => {
      const user = await target(connection, req);
      await connection.execute('UPDATE users SET full_name = ?, email = ?, department = ?, job_title = ? WHERE id = ?', [data.full_name, data.email, data.department, data.job_title, user.id]);
      await createAuditLog({ userId: req.user.id, action: 'USER_PROFILE_UPDATED', resourceType: 'USER', resourceId: user.id, details: { before: { full_name: user.full_name, email: user.email, department: user.department, job_title: user.job_title }, after: data } }, connection);
    });
    res.json({ success: true, data: await userModel.findById(req.params.id) });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') error = fail(409, 'This email address is already in use.'); next(error); }
};
const updateUserRole = async (req, res, next) => {
  try {
    const role = req.body.role;
    if (!catalog.roles.some(item => item.key === role)) throw fail(400, 'Invalid role.');
    await transaction(async connection => {
      const user = await target(connection, req, role);
      if (user.role === role) return;
      if (user.role === 'super_admin' && user.is_active) {
        const [rows] = await connection.query("SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1");
        if (rows[0].count <= 1) throw fail(409, 'The last active Super Admin cannot be demoted.');
      }
      // Reset individual overrides so access from the previous role cannot carry over.
      await connection.execute('UPDATE users SET role = ?, permission_overrides = NULL WHERE id = ?', [role, user.id]);
      await createAuditLog({ userId: req.user.id, action: 'USER_ROLE_UPDATED', resourceType: 'USER', resourceId: user.id, details: { targetEmail: user.email, before: { role: user.role, permission_overrides: parseJson(user.permission_overrides) }, after: { role, permission_overrides: null } } }, connection);
    });
    res.json({ success: true, data: await userModel.findById(req.params.id) });
  } catch (error) { next(error); }
};
const updateUserStatus = async (req, res, next) => {
  try {
    if (typeof req.body.is_active !== 'boolean') throw fail(400, 'is_active must be a boolean.');
    await transaction(async connection => {
      const user = await target(connection, req);
      if (Boolean(user.is_active) === req.body.is_active) return;
      if (user.role === 'super_admin' && !req.body.is_active) {
        const [rows] = await connection.query("SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1");
        if (rows[0].count <= 1) throw fail(409, 'The last active Super Admin cannot be deactivated.');
      }
      await connection.execute('UPDATE users SET is_active = ? WHERE id = ?', [req.body.is_active, user.id]);
      await createAuditLog({ userId: req.user.id, action: 'USER_STATUS_UPDATED', resourceType: 'USER', resourceId: user.id, details: { targetEmail: user.email, before: { is_active: Boolean(user.is_active) }, after: { is_active: req.body.is_active } } }, connection);
    });
    res.json({ success: true, data: await userModel.findById(req.params.id) });
  } catch (error) { next(error); }
};
const updateUserPermissions = async (req, res, next) => {
  try {
    const overrides = req.body.overrides;
    if (overrides === undefined || overrides !== null && (typeof overrides !== 'object' || Array.isArray(overrides) || Object.entries(overrides).some(([key, value]) => !permissionKeys.includes(key) || typeof value !== 'boolean'))) throw fail(400, 'Supply permission overrides as booleans, or null to restore role defaults.');
    await transaction(async connection => {
      const user = await target(connection, req);
      if (user.role === 'super_admin') throw fail(403, 'Super Admin permissions are protected.');
      if (overrides && Object.entries(overrides).some(([key, value]) => (!['admin', 'super_admin'].includes(user.role) && administrativeKeys.includes(key)) || (value && !hasPermission(req.user, key)))) throw fail(403, 'You cannot grant this permission.');
      await connection.execute('UPDATE users SET permission_overrides = ? WHERE id = ?', [overrides === null ? null : JSON.stringify(overrides), user.id]);
      await createAuditLog({ userId: req.user.id, action: 'USER_PERMISSIONS_UPDATED', resourceType: 'USER', resourceId: user.id, details: { targetEmail: user.email, before: parseJson(user.permission_overrides) || {}, after: overrides || {} } }, connection);
    });
    res.json({ success: true, data: await resolveAccess(await userModel.findById(req.params.id)) });
  } catch (error) { next(error); }
};
const getRoles = async (req, res, next) => {
  try { res.json({ success: true, data: await getRolePolicies(), permissions: catalog.permissions }); } catch (error) { next(error); }
};
const updateRolePolicy = async (req, res, next) => {
  try {
    const role = req.params.role, permissions = req.body.permissions;
    const message = validatePermissions(req.user, role, permissions);
    if (message) throw fail(403, message);
    if (!Number.isSafeInteger(req.body.version)) throw fail(400, 'Role policy version is required.');
    await transaction(async connection => {
      const [rows] = await connection.execute('SELECT * FROM role_permissions WHERE role_key = ? FOR UPDATE', [role]);
      if (!rows.length) throw fail(404, 'Role policy not found. Run the access migration.');
      if (rows[0].version !== req.body.version) throw fail(409, 'This role changed since you opened it. Refresh and try again.');
      await connection.execute('UPDATE role_permissions SET permissions = ?, version = version + 1, updated_by = ? WHERE role_key = ?', [JSON.stringify(permissions), req.user.id, role]);
      await createAuditLog({ userId: req.user.id, action: 'ROLE_PERMISSIONS_UPDATED', resourceType: 'ROLE', details: { role, before: { permissions: parseJson(rows[0].permissions) }, after: { permissions } } }, connection);
    });
    res.json({ success: true, data: await getRolePolicies() });
  } catch (error) { next(error); }
};
const getSystemStats = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) AS total_users, SUM(is_active = 1) AS active_users, SUM(is_active = 0) AS inactive_users FROM users');
    const [roles] = await pool.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    res.json({ success: true, data: { users: users[0], roles } });
  } catch (error) { next(error); }
};
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, user_id, resource_type, search, from, to } = req.query;
    const { page, limit } = pagination(req.query);
    const where = ['1=1'], params = [];
    for (const [key, value] of Object.entries({ action, resource_type })) if (value) { where.push('a.' + key + ' = ?'); params.push(value); }
    if (user_id) { where.push('a.user_id = ?'); params.push(id(user_id)); }
    for (const value of [from, to]) if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw fail(400, 'Use valid YYYY-MM-DD date filters.');
    if (from && to && from > to) throw fail(400, 'Start date must not follow end date.');
    if (from) { where.push('a.created_at >= ?'); params.push(from); }
    if (to) { where.push('a.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
    if (search) { where.push('(a.details LIKE ? OR COALESCE(a.actor_name,u.full_name) LIKE ? OR COALESCE(a.actor_email,u.email) LIKE ? OR a.action LIKE ? OR a.resource_type LIKE ? OR CAST(a.resource_id AS CHAR) LIKE ?)'); params.push(...Array(6).fill('%' + search + '%')); }
    const clause = where.join(' AND ');
    const [counts] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE ' + clause, params);
    const [rows] = await pool.query(`SELECT a.*, COALESCE(a.actor_name,u.full_name) AS user_name, COALESCE(a.actor_email,u.email) AS user_email FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE ${clause} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    const [actions] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    res.json({ success: true, data: rows.map(row => { let details = row.details; try { details = parseJson(details); } catch { /* Preserve historical text logs. */ } return { ...row, details }; }), total: counts[0].total, page, limit, actions: actions.map(row => row.action) });
  } catch (error) { next(error); }
};
module.exports = { getUsers, getUserById, createUser, updateUser, updateUserRole, updateUserStatus, updateUserPermissions, getRoles, updateRolePolicy, getSystemStats, getAuditLogs };
