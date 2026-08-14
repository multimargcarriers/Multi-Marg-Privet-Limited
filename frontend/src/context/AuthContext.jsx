import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './ToastContext';
import appDB from '../utils/appDB';

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  const navigate = useNavigate();
  const _location = useLocation();

  const normalizeUserData = (userData) => {
    if (!userData) return userData;
    const cleaned = { ...userData };
    if (cleaned.photo && typeof cleaned.photo === 'string' && cleaned.photo.toLowerCase().includes('res.cloudinary.com')) {
      cleaned.photo = cleaned.photo.toLowerCase();
    }
    if (cleaned.banner && typeof cleaned.banner === 'string' && cleaned.banner.toLowerCase().includes('res.cloudinary.com')) {
      cleaned.banner = cleaned.banner.toLowerCase();
    }
    return cleaned;
  };

  const fetchMe = async (currentToken) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.data.success) {
        const cleanUser = normalizeUserData(res.data.data);
        setUser(cleanUser);
        appDB.set('user', cleanUser);
        
        // Update token if the backend provided a fresh one (e.g. updated permissions)
        if (res.data.token) {
          setToken(res.data.token);
          localStorage.setItem('token', res.data.token);  // token stays in localStorage for sync interceptor access
        }
      }
    } catch (e) {
      console.error("Failed to fetch fresh user data from DB:", e);
      if (e.response?.status === 401) {
        logout();
      }
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = appDB.memGet('user');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        const cleanUser = normalizeUserData(storedUser);
        setUser(cleanUser);
        appDB.set('user', cleanUser);
        // Instantly unlock UI if cached data exists (0s cold start)
        setLoading(false);
      }
      // Silently sync fresh data from DB in background
      fetchMe(storedToken).finally(() => {
        if (!storedUser) setLoading(false);
      });

      // Refresh token on window focus to handle IAM changes seamlessly
      const onFocus = () => {
        const currentToken = localStorage.getItem('token');  // token stays in localStorage
        if (currentToken) fetchMe(currentToken);
      };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    } else {
      setLoading(false);
    }
  }, []);

  const logoutTimerId = useRef(null);
  const warningTimerId = useRef(null);
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const WARNING_BEFORE_MS = 60 * 1000; // Show warning 1 minute before logout

  useEffect(() => {
    // Axios 401 Interceptor
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.error("401 Unauthorized triggered by:", error.config?.url);
          logout();
        }
        return Promise.reject(error);
      }
    );

    const resetIdleTimer = () => {
      if (logoutTimerId.current) clearTimeout(logoutTimerId.current);
      if (warningTimerId.current) clearTimeout(warningTimerId.current);
      if (user && token) {
        // Warning toast 1 minute before auto-logout
        warningTimerId.current = setTimeout(() => {
          addToast("Your session will expire in 1 minute due to inactivity. Move your mouse to stay logged in.", "warning");
        }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
        
        logoutTimerId.current = setTimeout(() => {
          addToast("Session expired due to inactivity.", "warning");
          logout();
        }, IDLE_TIMEOUT_MS);
      }
    };

    // Event listeners for idle timeout — includes touch for mobile
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    const handleActivity = () => resetIdleTimer();
    
    if (user && token) {
      events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
      resetIdleTimer();
    }

    return () => {
      axios.interceptors.response.eject(interceptor);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (logoutTimerId.current) clearTimeout(logoutTimerId.current);
      if (warningTimerId.current) clearTimeout(warningTimerId.current);
    };
  }, [user, token]);

  const login = (userData, userToken) => {
    const cleanUser = normalizeUserData(userData);
    setUser(cleanUser);
    setToken(userToken);
    appDB.set('user', cleanUser);
    localStorage.setItem('token', userToken);

    // Determine initial route based on permissions
    const isSuperAdmin = userData.role === 'SuperAdmin' || userData.email === 'admin@multimargcarriers.co.in';
    const hasDashboard = isSuperAdmin || (userData.permissions && (userData.permissions.includes('all') || userData.permissions.includes('dashboard')));
    
    const savedRedirectUrl = localStorage.getItem('redirectUrl');

    if (savedRedirectUrl) {
      localStorage.removeItem('redirectUrl');  // redirectUrl stays in localStorage
      navigate(savedRedirectUrl);
    } else if (hasDashboard) {
      navigate('/dashboard');
    } else if (userData.role === 'Client' || userData.role === 'Vendor') {
      navigate('/trips');
    } else {
      navigate('/profile');
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error("Logout API failed", e);
    }
    
    let redirectUrl = null;
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      redirectUrl = window.location.pathname + window.location.search;
    }

    setUser(null);
    setToken(null);
    
    // Clear IndexedDB cache
    try {
      await appDB.clear();
    } catch (err) {
      console.error("Failed to clear appDB during logout", err);
    }
    // Clear localStorage (token, redirectUrl)
    localStorage.clear();
    sessionStorage.clear();

    if (redirectUrl) {
      localStorage.setItem('redirectUrl', redirectUrl);
    }
    
    window.location.href = '/';
  };

  const updateUser = (userData, userToken) => {
    const cleanUser = normalizeUserData(userData);
    setUser(cleanUser);
    if (userToken) setToken(userToken);
    appDB.set('user', cleanUser);
    if (userToken) localStorage.setItem('token', userToken);
  };

  const hasPermission = (moduleName) => {
    if (!user) return false;
    // Fallback for stale localStorage data
    if (user.role === 'SuperAdmin' || user.email === 'admin@multimargcarriers.co.in') return true;
    
    if (user.permissions && (user.permissions.includes('all') || user.permissions.includes(moduleName))) {
      return true;
    }
    
    // Implicit parent permissions for Vendors & Clients
    if (user.role === 'Vendor' || user.role === 'Client') {
      if (moduleName === 'trips' && 
          (user.permissions?.includes('tripmis') || user.permissions?.includes('vendormis') || user.permissions?.includes('trips'))) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, fetchMe, hasPermission }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
