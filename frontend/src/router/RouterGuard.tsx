import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';

interface Props {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export default function RouterGuard({ children, requireAuth, requireAdmin }: Props): ReactNode {
  const location = useLocation();
  const { user, isAdmin } = useAuthStore();

  if (requireAuth && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
