import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import appDB from '../utils/appDB';
import { getSocket } from '../hooks/useSocketSync';

export const BadgeContext = createContext();

export const BadgeProvider = ({ children }) => {
  const { user, hasPermission } = useContext(AuthContext);
  
  const [notifications, setNotifications] = useState(() => {
    if (!user) return [];
    const cached = appDB.memGet(`activityNotifications_${user.id}`);
    return Array.isArray(cached) ? cached : [];
  });

  // Helper to remove items older than 7 days
  const cleanupOldNotifications = (notifs) => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return notifs.filter(n => (now - n.timestamp) <= SEVEN_DAYS_MS);
  };

  // Re-initialize and cleanup when user changes
  useEffect(() => {
    if (user) {
      let cached = appDB.memGet(`activityNotifications_${user.id}`);
      if (!Array.isArray(cached)) cached = [];
      
      const cleaned = cleanupOldNotifications(cached);
      if (cleaned.length !== cached.length) {
        appDB.set(`activityNotifications_${user.id}`, cleaned);
      }
      setNotifications(cleaned);
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    
    const handleDataUpdate = (data) => {
      // Check if it's a "create" action
      if (data && data.action === "create" && data.module) {
        // PERMISSION CHECK
        let permissionKey = data.module;
        // Map backend module names to frontend permission keys if needed
        if (data.module === 'bills') permissionKey = 'all_bills';
        if (data.module === 'cashEntries') permissionKey = 'cash_sheet';
        
        // Only SuperAdmin, Admin, or user with permission gets the notification
        const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email?.includes('admin@');
        const isAdmin = user?.role === 'Admin';
        
        if (isSuperAdmin || isAdmin || (hasPermission && hasPermission(permissionKey))) {
          setNotifications(prev => {
            const newNotif = {
              id: (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).substring(2, 15),
              module: data.module,
              message: `New ${data.module.charAt(0).toUpperCase() + data.module.slice(1)} entry created`,
              timestamp: Date.now(),
              read: false
            };
            
            // Add new and cleanup old
            const nextNotifs = cleanupOldNotifications([newNotif, ...prev]);
            appDB.set(`activityNotifications_${user.id}`, nextNotifs);
            return nextNotifs;
          });
        }
      }
    };

    socket.on("data_updated", handleDataUpdate);

    return () => {
      socket.off("data_updated", handleDataUpdate);
    };
  }, [user, hasPermission]);

  // Compute unread counts for Sidebar exactly as they expect it
  const unreadCounts = useMemo(() => {
    const counts = {};
    notifications.forEach(n => {
      if (!n.read) {
        counts[n.module] = (counts[n.module] || 0) + 1;
      }
    });
    return counts;
  }, [notifications]);

  // Total unread for Bell
  const totalUnreadActivity = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Clear all for a module (used when user navigates to the module page)
  const clearBadge = (moduleName) => {
    if (!user) return;
    setNotifications(prev => {
      let changed = false;
      const nextNotifs = prev.map(n => {
        if (n.module === moduleName && !n.read) {
          changed = true;
          return { ...n, read: true };
        }
        return n;
      });
      
      if (changed) {
        appDB.set(`activityNotifications_${user.id}`, nextNotifs);
        return nextNotifs;
      }
      return prev;
    });
  };

  // Mark specific notification as read (used when clicked in Bell dropdown)
  const markAsRead = (id) => {
    if (!user) return;
    setNotifications(prev => {
      let changed = false;
      const nextNotifs = prev.map(n => {
        if (n.id === id && !n.read) {
          changed = true;
          return { ...n, read: true };
        }
        return n;
      });
      
      if (changed) {
        appDB.set(`activityNotifications_${user.id}`, nextNotifs);
        return nextNotifs;
      }
      return prev;
    });
  };

  return (
    <BadgeContext.Provider value={{ 
      unreadCounts, 
      clearBadge, 
      notifications, 
      totalUnreadActivity, 
      markAsRead 
    }}>
      {children}
    </BadgeContext.Provider>
  );
};
