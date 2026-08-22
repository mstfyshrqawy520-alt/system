import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { ForbiddenPage } from '../pages/ErrorPages';

interface RoleRouteProps {
  /** One or more role slugs that are allowed to access this route group */
  allowedRoles: string[];
  children?: React.ReactNode;
}

/**
 * RoleRoute — wraps a set of routes and redirects unauthorized users
 * to their own role home page instead of rendering the protected content.
 *
 * Backend APIs enforce the same restrictions with HTTP 403.
 * This component adds the matching frontend layer so unauthorized roles
 * never see another role's UI, even by direct URL navigation.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="جارٍ التحقق من جلسة الدخول..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin can access everything
  if (hasRole('admin')) {
    return children ? <>{children}</> : <Outlet />;
  }

  const isAllowed = allowedRoles.some((role) => hasRole(role));

  if (!isAllowed) {
    return <ForbiddenPage />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleRoute;
