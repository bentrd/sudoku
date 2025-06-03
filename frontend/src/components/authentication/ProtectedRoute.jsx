// frontend/src/components/authentication/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from './useAuth';

const ProtectedRoute = () => {
  const { accessToken, loading } = useAuth();
  const location = useLocation();

  // If we’re still loading (e.g. refreshing), show nothing (or a spinner)
  if (loading) {
    return null;
  }

  // If no token, redirect to login
  if (!accessToken) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Otherwise render children
  return <Outlet />;
}

export default ProtectedRoute;