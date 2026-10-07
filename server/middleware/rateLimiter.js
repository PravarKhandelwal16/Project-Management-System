const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Authentication endpoints (login, register)
 * Development-friendly configuration: 15 minutes window, 50 requests per IP
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

module.exports = {
  authRateLimiter,
};
