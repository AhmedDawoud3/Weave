import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWeaveStore } from '../store/useWeaveStore';

interface RouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: RouteProps) {
  const { isAuthenticated, user } = useWeaveStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.roles?.includes('Admin') || false;

  if (!isAdmin) {
    // If authenticated but not admin, redirect to normal dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
