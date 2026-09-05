import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import appDB from '../utils/appDB';

export const SettingsContext = createContext();

export const useSettings = () => {
  return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  const [globalSettings, setGlobalSettings] = useState(() => {
    const cached = appDB.memGet('globalSettings');
    if (cached) {
      try {
        const parsed = cached;
        if (parsed.integrations && parsed.integrations.enableBulkDelete === undefined) {
          parsed.integrations.enableBulkDelete = false;
        }
        if (parsed.integrations && parsed.integrations.enableCsvImport === undefined) {
          parsed.integrations.enableCsvImport = true;
        }
        if (parsed.integrations && parsed.integrations.enablePublicChatbot === undefined) {
          parsed.integrations.enablePublicChatbot = false;
        }
        return parsed;
      } catch (_e) {
        console.error("Failed to parse cached globalSettings");
      }
    }
    return {
    company: {
      name: "MULTIMARG CARRIERS PVT. LTD.",
      gstin: "05AANCM3054E1ZN",
      address: "LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND",
      email: "info@multimarg.com",
      phone: "+91 5944-324033",
      companyStampUrl: ""
    },
    ui: {
      darkMode: false,
      compactTables: false,
      defaultSidebarOpen: true,
      accordionSidebar: true,
      expandAllDropdowns: false,
      fontSize: 100,
      showManualSyncButton: false
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
      cloudinary: true,
      enableBulkDelete: false,
      enableCsvImport: true,
      enableGlobalBookingWindow: true,
      globalBookingWindowDays: 10,
      enablePublicChatbot: false
    },
    modules: {
      masters: true,
      rates: true,
      operations: true,
      billing: true,
      accounts: true,
      reports: true,
      uploads: true
    },
    system: {
      maintenanceMode: false
    }
    };
  });
  
  const [loadingSettings, setLoadingSettings] = useState(!appDB.memGet('globalSettings'));

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
        appDB.set('globalSettings', response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch global settings:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        appDB.remove('user');
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
    // Apply optimistically first — instant UI response
    setGlobalSettings(newSettings);
    appDB.set('globalSettings', newSettings);
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/settings/config`, newSettings, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success) {
        // Sync with authoritative server response
        setGlobalSettings(response.data.data);
        appDB.set('globalSettings', response.data.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update settings:', err);
      // On failure, revert to last known good settings from cache
      const lastGood = appDB.memGet('globalSettings');
      if (lastGood) setGlobalSettings(lastGood);
      return false;
    }
  };

  // Font size scale management (persisted in localStorage and user config)
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = appDB.memGet('app_font_size');
    if (saved) return typeof saved === 'number' ? saved : parseInt(saved, 10);
    return globalSettings?.ui?.fontSize || 100;
  });

  useEffect(() => {
    // Set CSS custom property on :root — the CSS rule `.page-content` picks it up
    if (fontSize && Number(fontSize) !== 100) {
      document.documentElement.style.setProperty('--app-zoom', `${fontSize}%`);
    } else {
      document.documentElement.style.removeProperty('--app-zoom');
    }
    appDB.set('app_font_size', fontSize);
  }, [fontSize]);

  // Sync font size when globalSettings load
  useEffect(() => {
    if (globalSettings?.ui?.fontSize && !appDB.memGet('app_font_size')) {
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
