// frontend/src/components/authentication/AuthProvider.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: attempt to fetch /me; if 401, try refresh once
  const fetchMe = async () => {
    try {
      // First, try to get /me using the current accessToken (in header)
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true, // <— ensure cookie is sent if needed
      });
      setUser(response.data.user);
      setLoading(false);
    } catch (err) {
      // If 401, attempt to refresh
      if (err.response?.status === 401) {
        try {
          const refreshResp = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL}/api/auth/refreshToken`,
            {
              withCredentials: true, // <— crucial: send the HTTP‐only cookie
            }
          );
          const newAccess = refreshResp.data.accessToken;
          setAccessToken(newAccess);
          // Retry /me now that we have a new accessToken
          const retry = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${newAccess}` },
            withCredentials: true,
          });
          console.log('User data after refresh:', retry.data);
          setUser(retry.data.user);
        } catch (refreshError) {
          console.error('Refresh failed:', refreshError);
          setUser(null);
          setAccessToken(null);
        } finally {
          setLoading(false);
        }
      } else {
        console.error('Error fetching user data:', err);
        setUser(null);
        setLoading(false);
      }
    }
  };

  // On mount, if we already have an accessToken in localStorage, attempt /me
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) setAccessToken(token);
    else setLoading(false);
  }, []);

  // Whenever accessToken changes, try to fetch /me
  useEffect(() => {
    if (accessToken) fetchMe();
  }, [accessToken]);

  // Expose login, logout, and sign‐up helpers
  const login = async ({ username, password }) => {
    try {
      const resp = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/login`,
        { username, password },
        { withCredentials: true }
      );
      const newAccess = resp.data.accessToken;
      localStorage.setItem('accessToken', newAccess);
      setAccessToken(newAccess);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/signout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
    }
  };

  const signup = async ({ username, email, password }) => {
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`, {
        username,
        email,
        password,
      });
      return resp.status === 201;
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, logout, signup, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, AuthContext };