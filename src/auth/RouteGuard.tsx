import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './store';
import { isStaffRole, personaFor, canCreateUsers } from '@/lib/roles';

interface GuardProps {
  children: ReactNode;
  /** If true, only ADMIN-grade users (incl. CS Infra) may enter. */
  adminOnly?: boolean;
}

export function RouteGuard({ children, adminOnly = false }: GuardProps) {
  const session = useAuth((s) => s.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Students/Faculty are mobile-only — boot them from the dashboard outright.
  if (!isStaffRole(session.user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly) {
    const persona = personaFor(session.user.role, session.user.program);
    if (!canCreateUsers(persona)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
