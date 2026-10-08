const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const auditContext = new AsyncLocalStorage();
const middleware = (req, res, next) => {
  const requestId = randomUUID();
  res.setHeader('X-Request-ID', requestId);
  auditContext.run({ req, requestId }, next);
};
module.exports = { auditContext, middleware };
