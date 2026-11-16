import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { roleHome, useAuth } from '@/providers/auth-context';
import type { Role } from '@/types/auth';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: readonly Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user } = useAuth();
  return user ? <Navigate to={roleHome(user.role)} replace /> : <Outlet />;
}
