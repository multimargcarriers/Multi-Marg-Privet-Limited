import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [incompleteItems, setIncompleteItems] = useState(() => {
    const cached = localStorage.getItem('incompleteNotifications');
    return cached ? JSON.parse(cached) : [];
  });
  const [totalIncomplete, setTotalIncomplete] = useState(() => {
    const cached = localStorage.getItem('totalIncompleteNotifications');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [loading, setLoading] = useState(!localStorage.getItem('incompleteNotifications'));

  const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

  const fetchIncompleteItems = async () => {
    if (!user) return; // Wait for user to be logged in
    
    try {
      if (!localStorage.getItem('incompleteNotifications')) setLoading(true);
      const res = await axios.get(`${API}/notifications/incomplete`);
      if (res.data.success) {
        setIncompleteItems(res.data.data.items || []);
        setTotalIncomplete(res.data.data.total || 0);
        localStorage.setItem('incompleteNotifications', JSON.stringify(res.data.data.items || []));
        localStorage.setItem('totalIncompleteNotifications', (res.data.data.total || 0).toString());
      }
    } catch (error) {
      console.error("Error fetching incomplete items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncompleteItems();
    
    // Refresh every 5 minutes just in case
    const interval = setInterval(fetchIncompleteItems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      incompleteItems,
      totalIncomplete,
      loading,
      refreshNotifications: fetchIncompleteItems
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => React.useContext(NotificationContext);
