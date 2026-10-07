const { createAuditLog } = require('../models/auditModel');

/**
 * Service to record system audit logs safely
 */
const logAuditEvent = async ({ userId, action, resourceType, resourceId, details }) => {
  try {
    await createAuditLog({
      userId,
      action,
      resourceType,
      resourceId,
      details,
    });
  } catch (error) {
    // Non-blocking error handling: Log warning but prevent crashing the main transaction
    console.error(`[AuditLog Warning] Failed to write audit log for action "${action}":`, error.message);
  }
};

module.exports = {
  logAuditEvent,
};
