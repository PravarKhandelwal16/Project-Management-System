const { createAuditLog } = require('../models/auditModel');

/**
 * Service to record system audit logs safely
 */
const logAuditEvent = async ({ userId, action, resourceType, resourceId, details, actor }) => {
  try {
    await createAuditLog({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      actor,
    });
  } catch (error) {
    // Non-blocking error handling: Log warning but prevent crashing the main transaction
    require('../utils/logger').error('audit_write_failed',{action,code:require('../utils/logger').errorCode(error)});
  }
};

module.exports = {
  logAuditEvent,
};
