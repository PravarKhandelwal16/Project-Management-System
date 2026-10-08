const {verifyToken}=require('../utils/tokens');
const userModel = require('../models/userModel');
const { resolveAccess } = require('../services/accessService');

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
    require('../utils/logger').error('missing_jwt_configuration');
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }

  try {
    const decoded = verifyToken(token);

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
    req.user = await resolveAccess(user);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') return res.status(401).json({ success: false, message: 'Invalid token.' });
    next(error);
  }
};

module.exports = authenticateToken;
