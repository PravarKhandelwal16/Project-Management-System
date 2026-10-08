const { pool } = require('../config/db');
const { auditContext } = require('../middleware/auditContext');
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /password|secret|token|authorization|cookie|smtp_pass/i.test(key) ? '[REDACTED]' : redact(item)]));
  return value;
}
async function createAuditLog({ userId = null, action, resourceType, resourceId = null, details = null, actor }, executor = pool) {
  const context = auditContext.getStore();
  const identity = actor || context?.req.user;
  const [result] = await executor.execute(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, actor_name, actor_email, ip_address, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, action, resourceType, resourceId, details == null ? null : JSON.stringify(redact(details)),
      identity?.full_name || null, identity?.email || null, context?.req.ip || null, context?.requestId || null]
  );
  return result.insertId;
}
module.exports = { createAuditLog, redact };
