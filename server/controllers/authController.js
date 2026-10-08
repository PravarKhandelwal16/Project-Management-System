const bcrypt = require('bcrypt');
const {signToken}=require('../utils/tokens');
const userModel = require('../models/userModel');
const { resolveAccess } = require('../services/accessService');
const { logAuditEvent } = require('../services/auditService');
const {
  validateRegisterInput,
  validateLoginInput,
} = require('../utils/validation');

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;

    // 1. Validate inputs
    const validation = validateRegisterInput({ full_name, email, password });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = full_name.trim();

    // 2. Check for duplicate email
    const existingUser = await userModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // 3. Hash password securely with bcrypt
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 4. Create user in database (Stage 3 default role: 'member', is_active: 1)
    const userId = await userModel.createUser({
      full_name: trimmedName,
      email: normalizedEmail,
      password_hash,
      role: 'member',
      is_active: 1,
    });

    // 5. Record audit log
    await logAuditEvent({
      userId,
      actor: { full_name: trimmedName, email: normalizedEmail },
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: userId,
      details: {
        email: normalizedEmail,
        full_name: trimmedName,
        role: 'member',
      },
    });

    // 6. Return response (never return password_hash)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (error) {
    if(error.code==='ER_DUP_ENTRY')return res.status(409).json({success:false,message:'An account with this email already exists'});
    next(error);
  }
};

/**
 * Login existing user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate login payload
    const validation = validateLoginInput({ email, password });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Fetch user by email
    const user = await userModel.findByEmail(normalizedEmail);
    if (!user) {
      await logAuditEvent({ action: 'USER_LOGIN_FAILED', resourceType: 'ACCESS', details: { email: normalizedEmail, reason: 'Invalid credentials' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check account status
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // 3. Verify password hash using bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordMatch) {
      await logAuditEvent({ userId: user.id, actor: user, action: 'USER_LOGIN_FAILED', resourceType: 'ACCESS', resourceId: user.id, details: { reason: 'Invalid credentials' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      require('../utils/logger').error('missing_jwt_configuration');
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }

    const token = signToken(user.id);

    // 5. Record audit log
    const clientIp = req.ip || 'unknown';
    await logAuditEvent({
      userId: user.id,
      actor: { full_name: user.full_name, email: user.email },
      action: 'USER_LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      details: {
        email: user.email,
        ip: clientIp,
      },
    });

    // 6. Return success response with token & sanitized user object
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: !!user.is_active,
        ...(await resolveAccess(await userModel.findById(user.id))),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is populated by database-backed authMiddleware
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        full_name: req.user.full_name,
        email: req.user.email,
        role: req.user.role,
        ...req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (stateless JWT acknowledgment)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  await logAuditEvent({ userId: req.user.id, action: 'USER_LOGOUT', resourceType: 'USER', resourceId: req.user.id });
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
