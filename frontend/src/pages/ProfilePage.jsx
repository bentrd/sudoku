// frontend/src/pages/ProfilePage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth  from '../components/authentication/useAuth';

const ProfilePage = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // If still fetching auth state, do nothing yet
  useEffect(() => {
    if (!loading && !user) {
      // No user => redirect to /login
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    // Optionally show a spinner or “Loading…” text
    return (
      <div className="p-8 min-w-screen flex flex-col items-center content-center">
        <div className="text-gray-500 text-lg">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-w-screen flex flex-col items-center content-center">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          My Profile
        </h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600">
              Username
            </label>
            <p className="mt-1 text-lg text-gray-700">{user.username}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600">
              Email
            </label>
            <p className="mt-1 text-lg text-gray-700">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;