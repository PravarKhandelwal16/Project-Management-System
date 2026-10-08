const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

/**
 * Authentication Middleware
 * Validates JSON Web Token from Authorization header AND performs database-backed verification
 * to ensure roles and active status are always fresh (never stale from old JWT claims).
 */
const authenticateToken = async (req, res, next) => {
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

    // Database-backed verification to prevent stale JWT claims
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists. Please register or log in again.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Attach fresh, database-verified user context to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: !!user.is_active,
    };

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
