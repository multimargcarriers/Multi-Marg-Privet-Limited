import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './ToastContext';
import appDB from '../utils/appDB';
import DeviceLockModal from '../components/DeviceLockModal';

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScreenLocked, setIsScreenLocked] = useState(() => {
    return sessionStorage.getItem('is_device_locked') === 'true';
  });
  const { addToast } = useToast();
  
  const navigate = useNavigate();
  const _location = useLocation();

  const lastActiveTimeRef = useRef(Date.now());
  const INACTIVITY_LOCK_MS = 5 * 60 * 1000; // 5 minutes inactivity / background threshold

  const normalizeUserData = (userData) => {
    if (!userData) return userData;
    return { ...userData };
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
          localStorage.setItem('token', res.data.token);
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
        setLoading(false);
      }
      // Silently sync fresh data from DB in background
      fetchMe(storedToken).finally(() => {
        if (!storedUser) setLoading(false);
      });

      const onFocus = () => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) fetchMe(currentToken);
      };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    } else {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------
  // 5-Minute Inactivity & Background Biometric Lock Screen Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user || !token) return;

    // Check if user was inactive or away for >= 5 minutes
    const checkElapsedInactivity = () => {
      const lastActive = localStorage.getItem('mm_last_active');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed >= INACTIVITY_LOCK_MS) {
          setIsScreenLocked(true);
          sessionStorage.setItem('is_device_locked', 'true');
        }
      }
    };

    // Check on mount/re-focus
    checkElapsedInactivity();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkElapsedInactivity();
        lastActiveTimeRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      checkElapsedInactivity();
      lastActiveTimeRef.current = Date.now();
    };

    // User interaction events reset on-screen activity
    const recordUserActivity = () => {
      const now = Date.now();
      lastActiveTimeRef.current = now;
      localStorage.setItem('mm_last_active', now.toString());
    };

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchmove'];
    activityEvents.forEach(evt => window.addEventListener(evt, recordUserActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Periodic check every 10s for inactive on-screen sessions (>= 5 minutes idle)
    const intervalId = setInterval(() => {
      const lastActive = localStorage.getItem('mm_last_active') || lastActiveTimeRef.current;
      const idleElapsed = Date.now() - parseInt(lastActive, 10);
      if (idleElapsed >= INACTIVITY_LOCK_MS) {
        setIsScreenLocked(true);
        sessionStorage.setItem('is_device_locked', 'true');
      }
    }, 10000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, recordUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(intervalId);
    };
  }, [user, token]);

  const handleUnlockScreen = () => {
    setIsScreenLocked(false);
    sessionStorage.removeItem('is_device_locked');
    const now = Date.now();
    lastActiveTimeRef.current = now;
    localStorage.setItem('mm_last_active', now.toString());
    addToast('Device verified successfully', 'success');
  };

  const login = (userData, userToken) => {
    const cleanUser = normalizeUserData(userData);
    setUser(cleanUser);
    setToken(userToken);
    setIsScreenLocked(false);
    sessionStorage.removeItem('is_device_locked');
    sessionStorage.removeItem('bg_start_time');
    lastActiveTimeRef.current = Date.now();
    appDB.set('user', cleanUser);
    localStorage.setItem('token', userToken);

    const isSuperAdmin = userData.role === 'SuperAdmin' || userData.email === 'admin@multimarg.com';
    const hasDashboard = isSuperAdmin || (userData.permissions && (userData.permissions.includes('all') || userData.permissions.includes('dashboard')));
    
    const savedRedirectUrl = localStorage.getItem('redirectUrl');

    if (savedRedirectUrl) {
      localStorage.removeItem('redirectUrl');
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
    setIsScreenLocked(false);
    
    try {
      await appDB.clear();
    } catch (err) {
      console.error("Failed to clear appDB during logout", err);
    }
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
    if (user.role === 'SuperAdmin' || user.email === 'admin@multimarg.com') return true;
    
    if (user.permissions && (user.permissions.includes('all') || user.permissions.includes(moduleName))) {
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isScreenLocked, lockScreen: () => setIsScreenLocked(true), login, logout, updateUser, fetchMe, hasPermission }}>
      {children}
      {isScreenLocked && user && token && (
        <DeviceLockModal
          user={user}
          onUnlock={handleUnlockScreen}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  );
};
