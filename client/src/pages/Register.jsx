import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerSchema } from '@shared/validation/authSchemas.js';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validateForm = () => {
    const payload = {
      full_name: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password
    };

    const result = registerSchema.safeParse(payload);
    const errors = {};

    if (!result.success) {
      result.error.errors.forEach(err => {
        const path = err.path[0];
        if (path === 'full_name') errors.fullName = err.message;
        else errors[path] = err.message;
      });
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData.fullName.trim(), formData.email.trim(), formData.password);
      // Redirect to login with friendly success confirmation
      navigate('/login', {
        state: {
          successMessage: 'Account created successfully! Please sign in with your credentials.',
        },
      });
    } catch (error) {
      setServerError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-icon">📝</div>
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join the Project Management System workspace</p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="auth-alert alert-error" role="alert">
            <span className="alert-icon">✕</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className={`form-input ${formErrors.fullName ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {formErrors.fullName && <span className="error-text">{formErrors.fullName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@company.com"
              className={`form-input ${formErrors.email ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {formErrors.email && <span className="error-text">{formErrors.email}</span>}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-toggle-btn"
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters (letters & numbers)"
              className={`form-input ${formErrors.password ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {formErrors.password && <span className="error-text">{formErrors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              className={`form-input ${formErrors.confirmPassword ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {formErrors.confirmPassword && (
              <span className="error-text">{formErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
            id="register-submit-btn"
          >
            {isSubmitting ? (
              <span className="btn-loading-content">
                <span className="spinner-inline" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
