import Skeleton from './Skeleton';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute component - ensures only authenticated users can access child routes
 */
export const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div style={{width:'min(900px, 90vw)'}}><Skeleton label="Verifying authentication" rows={3}/></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) return <div className="management-empty"><h2>Access restricted</h2><p>Your account does not have permission to view this page.</p><a href="/dashboard">Return to dashboard</a></div>;
  return children;
};

export default ProtectedRoute;
