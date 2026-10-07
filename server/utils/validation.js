/**
 * Validation utilities for User Authentication
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
 * @param {{ full_name?: string, email?: string, password?: string }} data
 * @returns {{ isValid: boolean, error?: string }}
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
 * @param {{ email?: string, password?: string }} data
 * @returns {{ isValid: boolean, error?: string }}
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

module.exports = {
  validateFullName,
  validateEmail,
  validatePassword,
  validateRegisterInput,
  validateLoginInput,
};
