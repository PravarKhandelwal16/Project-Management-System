import BrandMark from '../components/BrandMark';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '@shared/validation/authSchemas.js';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpiredMessage, clearSessionExpired } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successNotice, setSuccessNotice] = useState(location.state?.successMessage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear notice after 8 seconds
  useEffect(() => {
    if (successNotice) {
      const timer = setTimeout(() => setSuccessNotice(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [successNotice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific validation error on change
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validateForm = () => {
    const result = loginSchema.safeParse(formData);
    
    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors = {};
    result.error.errors.forEach(err => {
      errors[err.path[0]] = err.message;
    });
    setFormErrors(errors);
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    clearSessionExpired();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(formData.email.trim(), formData.password);
      // Navigate to destination or dashboard
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-icon"><BrandMark size={48}/></div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to access your projects and tasks</p>
        </div>

        {/* Notices & Alerts */}
        {sessionExpiredMessage && (
          <div className="auth-alert alert-warning" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{sessionExpiredMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="auth-alert alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successNotice}</span>
          </div>
        )}

        {serverError && (
          <div className="auth-alert alert-error" role="alert">
            <span className="alert-icon">✕</span>
            <span>{serverError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              placeholder="name@company.com"
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
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`form-input ${formErrors.password ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {formErrors.password && <span className="error-text">{formErrors.password}</span>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
            id="login-submit-btn"
          >
            {isSubmitting ? (
              <span className="btn-loading-content">
                <span className="spinner-inline" />
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
