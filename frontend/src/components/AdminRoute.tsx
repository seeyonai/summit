import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  if (loading) return <div className="w-full flex items-center justify-center py-16">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default AdminRoute;
