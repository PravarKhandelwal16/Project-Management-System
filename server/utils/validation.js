/**
 * Reusable validation utilities for Authentication, Projects, and Roles
 */

const { ALL_ROLES } = require('./roles');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const VALID_PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const ALLOWED_PROJECT_SORT_FIELDS = ['name', 'status', 'start_date', 'end_date', 'created_at'];

/**
 * Validates full name
 * @param {string} name
 * @returns {{ isValid: boolean, error?: string }}
 */
const validateFullName = (name) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Full name is required' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Full name cannot exceed 100 characters' };
  }
  return { isValid: true };
};

/**
 * Validates email format and length
 * @param {string} email
 * @returns {{ isValid: boolean, error?: string }}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 255) {
    return { isValid: false, error: 'Email cannot exceed 255 characters' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please provide a valid email address' };
  }
  return { isValid: true };
};

/**
 * Validates password strength: at least 8 characters, containing at least 1 letter and 1 number
 * @param {string} password
 * @returns {{ isValid: boolean, error?: string }}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }
  return { isValid: true };
};

/**
 * Validates registration input payload
 */
const validateRegisterInput = ({ full_name, email, password }) => {
  const nameCheck = validateFullName(full_name);
  if (!nameCheck.isValid) return nameCheck;

  const emailCheck = validateEmail(email);
  if (!emailCheck.isValid) return emailCheck;

  const passCheck = validatePassword(password);
  if (!passCheck.isValid) return passCheck;

  return { isValid: true };
};

/**
 * Validates login input payload
 */
const validateLoginInput = ({ email, password }) => {
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  const emailCheck = validateEmail(email);
  if (!emailCheck.isValid) return emailCheck;

  return { isValid: true };
};

/**
 * Validates date string (YYYY-MM-DD)
 */
const isValidDateString = (dateStr) => {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

/**
 * Validates project create/update input payload
 */
const validateProjectInput = ({ name, description, status, start_date, end_date }) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Project name is required' };
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Project name must be at least 2 characters long' };
  }
  if (trimmedName.length > 255) {
    return { isValid: false, error: 'Project name cannot exceed 255 characters' };
  }

  if (status && !VALID_PROJECT_STATUSES.includes(status)) {
    return {
      isValid: false,
      error: `Invalid status. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
    };
  }

  if (start_date && !isValidDateString(start_date)) {
    return { isValid: false, error: 'Invalid start date format' };
  }

  if (end_date && !isValidDateString(end_date)) {
    return { isValid: false, error: 'Invalid end date format' };
  }

  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) {
      return { isValid: false, error: 'End date cannot be earlier than start date' };
    }
  }

  return { isValid: true };
};

/**
 * Validates sorting parameters for projects allowlist
 */
const validateProjectSort = (sortBy = 'created_at', sortOrder = 'DESC') => {
  const cleanSortBy = ALLOWED_PROJECT_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
  const cleanSortOrder = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { sortBy: cleanSortBy, sortOrder: cleanSortOrder };
};

/**
 * Validates role input
 */
const validateRole = (role) => {
  if (!role || !ALL_ROLES.includes(role)) {
    return {
      isValid: false,
      error: `Invalid role. Must be one of: ${ALL_ROLES.join(', ')}`,
    };
  }
  return { isValid: true };
};

module.exports = {
  validateFullName,
  validateEmail,
  validatePassword,
  validateRegisterInput,
  validateLoginInput,
  validateProjectInput,
  validateProjectSort,
  validateRole,
  VALID_PROJECT_STATUSES,
  ALLOWED_PROJECT_SORT_FIELDS,
};
