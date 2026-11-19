import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { roleHome, useAuth } from '@/providers/auth-context';
import type { Role } from '@/types/auth';
import { safeCandidateReturnTo } from '@/lib/loginRedirect';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: readonly Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const returnTo =
    user?.role === 'CANDIDATE'
      ? safeCandidateReturnTo(new URLSearchParams(location.search).get('returnTo'))
      : null;
  // Keep the apply destination when login updates context before navigation commits.
  return user ? <Navigate to={returnTo ?? roleHome(user.role)} replace /> : <Outlet />;
}
