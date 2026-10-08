const catalog = require('../../shared/access.json');
const { pool } = require('../config/db');
const permissionKeys = catalog.permissions.map(permission => permission.key);
const administrativeKeys = catalog.permissions.filter(permission => permission.administrative).map(permission => permission.key);
const isAdministrator = user => ['super_admin', 'admin'].includes(user?.role);
const hasPermission = (user, permission) => user?.role === 'super_admin' || user?.permissions?.includes(permission) === true;
const parseJson = value => typeof value === 'string' ? JSON.parse(value) : value;

async function getRolePolicies(executor = pool) {
  const [rows] = await executor.query('SELECT role_key, permissions, version FROM role_permissions');
  return catalog.roles.map(role => {
    const stored = rows.find(row => row.role_key === role.key);
    return { ...role, permissions: role.key === 'super_admin' ? permissionKeys : (stored ? parseJson(stored.permissions) : role.permissions), version: stored?.version || 0 };
  });
}
async function resolveAccess(user) {
  const policies = await getRolePolicies();
  const policy = policies.find(role => role.key === user.role);
  const overrides = parseJson(user.permission_overrides) || {};
  let permissions = new Set(policy?.permissions || []);
  for (const [key, allowed] of Object.entries(overrides)) {
    if (allowed === true) permissions.add(key);
    if (allowed === false) permissions.delete(key);
  }
  if (!isAdministrator(user)) administrativeKeys.forEach(key => permissions.delete(key));
  if (user.role === 'super_admin') permissions = new Set(permissionKeys);
  return { ...user, role_label: policy?.label || user.role, permissions: [...permissions], permission_overrides: overrides };
}
function validatePermissions(actor, role, permissions) {
  if (!catalog.roles.some(item => item.key === role) || !Array.isArray(permissions) || permissions.some(key => !permissionKeys.includes(key)) || new Set(permissions).size !== permissions.length) return 'Select valid, unique permissions.';
  if (role === 'super_admin') return 'Super Admin permissions are protected.';
  if (!isAdministrator(actor) || !hasPermission(actor, 'roles.manage')) return 'You cannot edit access policies.';
  if (actor.role !== 'super_admin' && ['admin', 'super_admin'].includes(role)) return 'Only Super Admin can edit administrator permissions.';
  if (!['admin', 'super_admin'].includes(role) && permissions.some(key => administrativeKeys.includes(key))) return 'Administrative permissions are reserved for administrator roles.';
  if (actor.role !== 'super_admin' && permissions.some(key => !hasPermission(actor, key))) return 'You cannot grant permissions you do not have.';
  return null;
}
function canManageAccount(actor, target, nextRole = target.role) {
  if (actor.id === target.id) return false;
  if (actor.role === 'super_admin') return true;
  return actor.role === 'admin' && !['super_admin', 'admin'].includes(target.role) && !['super_admin', 'admin'].includes(nextRole);
}
async function projectInScope(user, project) {
  if (hasPermission(user, 'projects.view_all') || Number(project.user_id) === Number(user.id)) return true;
  const [rows] = await pool.execute('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [project.id, user.id]);
  return rows.length > 0;
}
function projectScope(user, alias = 'p') {
  if (!hasPermission(user, 'projects.view')) return { sql: '0=1', params: [] };
  if (hasPermission(user, 'projects.view_all')) return { sql: '1=1', params: [] };
  return { sql: `(${alias}.user_id = ? OR ${alias}.id IN (SELECT project_id FROM project_members WHERE user_id = ?))`, params: [user.id, user.id] };
}
module.exports = { catalog, permissionKeys, administrativeKeys, isAdministrator, hasPermission, getRolePolicies, resolveAccess, validatePermissions, canManageAccount, projectInScope, projectScope, parseJson };
