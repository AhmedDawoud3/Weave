import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWeaveStore } from '../store/useWeaveStore';

interface RouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: RouteProps) {
  const { isAuthenticated } = useWeaveStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: RouteProps) {
  const { isAuthenticated } = useWeaveStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
