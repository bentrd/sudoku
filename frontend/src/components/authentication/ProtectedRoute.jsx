import { Navigate, Outlet, useLocation } from "react-router-dom";

export const ProtectedRoute = () => {
  const location = useLocation();
  // Check if the user is authenticated by looking for a token
  const token = localStorage.getItem('accessToken');
  if (!token) {
    // If not authenticated, redirect to the login page
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  return <Outlet />;
};