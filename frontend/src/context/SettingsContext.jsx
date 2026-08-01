import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  const [globalSettings, setGlobalSettings] = useState({
    company: {
      name: "Multi Marg Carriers",
      gstin: "",
      address: "",
      email: "",
      phone: ""
    },
    ui: {
      darkMode: false,
      compactTables: false,
      defaultSidebarOpen: true,
      accordionSidebar: true,
      expandAllDropdowns: false,
      fontSize: 100
    },
    security: {
      sessionTimeout: 60,
      requireTwoFactor: false,
      restrictIp: false
    },
    billing: {
      defaultGst: 5,
      autoGenerateInvoice: true,
      enableRounding: true
    },
    notifications: {
      emailOnBooking: true,
      smsOnDispatch: false,
      dailyReports: true
    },
    integrations: {
      redis: true,
      cloudinary: true
    },
    modules: {
      masters: true,
      rates: true,
      operations: true,
      billing: true,
      accounts: true,
      reports: true,
      uploads: true
    }
  });
  
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = async () => {
    try {
      if (!user) {
        setLoadingSettings(false);
        return;
      }
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/config`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success && response.data.data) {
        setGlobalSettings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch global settings:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  // Apply dark mode to document root
  useEffect(() => {
    if (globalSettings?.ui?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [globalSettings?.ui?.darkMode]);

  const updateGlobalSettings = async (newSettings) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/config`, newSettings, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        setGlobalSettings(response.data.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update settings:', err);
      return false;
    }
  };

  // Font size scale management (persisted in localStorage and user config)
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem('app_font_size');
    if (saved) return parseInt(saved, 10);
    return globalSettings?.ui?.fontSize || 100;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem('app_font_size', fontSize.toString());
  }, [fontSize]);

  // Sync font size when globalSettings load
  useEffect(() => {
    if (globalSettings?.ui?.fontSize && !localStorage.getItem('app_font_size')) {
      setFontSizeState(globalSettings.ui.fontSize);
    }
  }, [globalSettings?.ui?.fontSize]);

  const changeFontSize = (newSize) => {
    const clamped = Math.max(50, Math.min(400, newSize));
    setFontSizeState(clamped);
    if (user && globalSettings?.ui) {
      const updatedSettings = {
        ...globalSettings,
        ui: { ...globalSettings.ui, fontSize: clamped }
      };
      updateGlobalSettings(updatedSettings);
    }
  };

  const increaseFontSize = () => changeFontSize(fontSize + 5);
  const decreaseFontSize = () => changeFontSize(fontSize - 5);
  const resetFontSize = () => changeFontSize(100);

  return (
    <SettingsContext.Provider 
      value={{ 
        globalSettings, 
        loadingSettings, 
        updateGlobalSettings, 
        refreshSettings: fetchSettings,
        fontSize,
        changeFontSize,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
