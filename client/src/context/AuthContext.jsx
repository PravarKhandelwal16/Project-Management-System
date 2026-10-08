import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, getMeApi, logoutApi } from '../services/api';

const TOKEN_STORAGE_KEY = 'pms_token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);

  /**
   * Log out user, purge local storage, and reset state
   */
  const logout = useCallback(async ({ sessionExpired = false } = {}) => {
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (currentToken) {
      try {
        await logoutApi(currentToken);
      } catch {
        // Ignore server error during client logout
      }
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);

    if (sessionExpired) {
      setSessionExpiredMessage('Your session has expired. Please log in again.');
    } else {
      setSessionExpiredMessage(null);
    }
  }, []);

  /**
   * Refresh current user details from backend
   */
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!currentToken) return null;
    try {
      const response = await getMeApi(currentToken);
      if (response.success && response.user && localStorage.getItem(TOKEN_STORAGE_KEY) === currentToken) {
        setUser(response.user);
        return response.user;
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        logout({ sessionExpired: true });
      }
    }
    return null;
  }, [logout]);

  /**
   * Initialize session on app boot
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await getMeApi(storedToken);
        if (isMounted) {
          if (response.success && response.user) {
            setUser(response.user);
            setToken(storedToken);
          } else {
            logout({ sessionExpired: true });
          }
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Session verification failed:', error.message);
          if (error.status === 401 || error.status === 403) {
            logout({ sessionExpired: true });
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(refreshUser, 30000);
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [token, refreshUser]);

  /**
   * Handle user login
   */
  const login = async (email, password) => {
    setSessionExpiredMessage(null);
    const data = await loginApi({ email, password });

    if (data.success && data.token && data.user) {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }

    throw new Error(data.message || 'Login failed');
  };

  /**
   * Handle user registration
   */
  const register = async (fullName, email, password) => {
    const data = await registerApi({
      full_name: fullName,
      email,
      password,
    });
    return data;
  };

  /**
   * Reset session expired alert
   */
  const clearSessionExpired = () => {
    setSessionExpiredMessage(null);
  };

  // RBAC permissions helper flags
  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isProjectManager = role === 'project_manager';
  const isMember = role === 'member';
  const hasPermission = permission => isSuperAdmin || user?.permissions?.includes(permission) === true;
  const canCreateProject = hasPermission('projects.create');
  const canManageUsers = hasPermission('users.view');

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    sessionExpiredMessage,
    isSuperAdmin,
    isAdmin,
    isProjectManager,
    isMember,
    canCreateProject,
    canManageUsers,
    hasPermission,
    login,
    register,
    logout,
    refreshUser,
    clearSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
