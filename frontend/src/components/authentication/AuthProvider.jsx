import axios from "axios";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // State to hold the authentication token
  const [token, setToken_] = useState(localStorage.getItem("token"));

  // Function to set the authentication token
  const setToken = (newToken) => {
    setToken_(newToken);
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        // Fetch user data from the API to verify the token
        const response = await axios.get("localhost:3001/api/me");
        console.log("User data fetched successfully:", response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        // If there's an error, clear the token
        setToken(null);
      }
    }
    fetchMe();
  }, []);

  useLayoutEffect(() => {
    const authInterceptor = axios.interceptors.request.use(
      (config) => {
        config.headers.Authorization = 
        !config._retry && token ? `Bearer ${token}` : config.headers.Authorization;
        return config;
      });
      return () => {
        axios.interceptors.request.eject(authInterceptor);
      };
  }, [token]);

  useLayoutEffect(() => {
    const refreshInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        // If the token is expired, clear it
        if (error.response.status === 401 && error.response.data.message === "Unauthorized") {
          try {
            const response = await axios.get("localhost:3001/api/refreshToken");
            setToken(response.data.accessToken);

            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
            originalRequest._retry = true;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error("Error refreshing token:", refreshError);
            // If refreshing fails, clear the token
            setToken(null);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(refreshInterceptor);
    };
  }, [token]);

  // Memoized value of the authentication context
  const contextValue = useMemo(
    () => ({
      token,
      setToken,
    }),
    [token]
  );

  // Provide the authentication context to the children components
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;