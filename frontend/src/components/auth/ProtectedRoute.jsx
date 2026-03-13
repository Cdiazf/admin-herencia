import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

export default function ProtectedRoute({ roles }) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Validando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
