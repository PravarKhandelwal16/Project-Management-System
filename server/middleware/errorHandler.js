/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 && process.env.NODE_ENV !== 'development' ? 'Something went wrong. Please try again.' : err.message || 'Internal Server Error';

  if (statusCode >= 500) console.error(`[Error] ${req.method} ${req.path}:`, err.stack || err.message);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
