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
      defaultSidebarOpen: true
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
      // Accessible to all authenticated users
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

  return (
    <SettingsContext.Provider value={{ globalSettings, loadingSettings, updateGlobalSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
