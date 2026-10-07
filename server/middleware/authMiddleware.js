const jwt = require('jsonwebtoken');

/**
 * Authentication Middleware
 * Validates JSON Web Token from the Authorization header and attaches decoded user to req.user
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Token is missing.',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Security Warning] JWT_SECRET is not configured in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Internal server security configuration error',
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    // Attach decoded user information: id, email, role
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed token. Authentication failed.',
    });
  }
};

module.exports = authenticateToken;
