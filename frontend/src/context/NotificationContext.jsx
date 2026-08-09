import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import appDB from '../utils/appDB';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [incompleteItems, setIncompleteItems] = useState(() => {
    const cached = appDB.memGet('incompleteNotifications');
    return cached || [];
  });
  const [totalIncomplete, setTotalIncomplete] = useState(() => {
    const cached = appDB.memGet('totalIncompleteNotifications');
    return cached ? (typeof cached === 'number' ? cached : parseInt(cached, 10)) : 0;
  });
  const [loading, setLoading] = useState(!appDB.memGet('incompleteNotifications'));

  const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

  const fetchIncompleteItems = async () => {
    if (!user || !token) return; // Wait for user to be logged in
    
    try {
      if (!appDB.memGet('incompleteNotifications')) setLoading(true);
      const res = await axios.get(`${API}/notifications/incomplete`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setIncompleteItems(res.data.data.items || []);
        setTotalIncomplete(res.data.data.total || 0);
        appDB.set('incompleteNotifications', res.data.data.items || []);
        appDB.set('totalIncompleteNotifications', res.data.data.total || 0);
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
