import React, { createContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user info");
      }
    }
    setLoading(false);
  }, []);

  const logoutTimerId = useRef(null);
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Axios 401 Interceptor
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    const resetIdleTimer = () => {
      if (logoutTimerId.current) clearTimeout(logoutTimerId.current);
      if (user && token) {
        logoutTimerId.current = setTimeout(() => {
          alert("Session expired due to inactivity.");
          logout();
        }, IDLE_TIMEOUT_MS);
      }
    };

    // Event listeners for idle timeout
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    const handleActivity = () => resetIdleTimer();
    
    if (user && token) {
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetIdleTimer();
    }

    return () => {
      axios.interceptors.response.eject(interceptor);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (logoutTimerId.current) clearTimeout(logoutTimerId.current);
    };
  }, [user, token]);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    navigate('/dashboard');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const updateUser = (userData, userToken) => {
    setUser(userData);
    if (userToken) setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userToken) localStorage.setItem('token', userToken);
  };

  const hasPermission = (moduleName) => {
    if (!user) return false;
    // Fallback for stale localStorage data
    if (user.role === 'SuperAdmin' || user.email === 'admin@multimargcarriers.co.in') return true;
    
    if (user.permissions && (user.permissions.includes('all') || user.permissions.includes(moduleName))) {
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
