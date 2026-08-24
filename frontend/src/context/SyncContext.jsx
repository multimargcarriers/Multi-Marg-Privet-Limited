import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import syncManager from '../utils/syncManager';
import { useToast } from './ToastContext';

const SyncContext = createContext();

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState(syncManager.getQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();
  // Stable ref so the effect doesn't re-run every time ToastContext re-renders
  const addToastRef = useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  useEffect(() => {
    const toast = (...args) => addToastRef.current(...args);

    const handleOnline = () => {
      setIsOnline(true);
      if (syncManager.getQueue().length > 0) {
        toast('Back online. Synchronizing data...', 'info');
        syncManager.syncAll();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. Changes will be saved locally.', 'warning');
    };

    const handleQueueUpdated = (e) => setSyncQueue(e.detail);
    const handleSyncStarted = () => setIsSyncing(true);
    const handleSyncCompleted = () => {
      setIsSyncing(false);
      if (syncManager.getQueue().length === 0) {
        toast('All offline changes have been synchronized.', 'success');
      }
    };
    const handleSyncError = (e) => {
      toast(`Failed to sync a request: ${e.detail.error.message}`, 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-queue-updated', handleQueueUpdated);
    window.addEventListener('sync-started', handleSyncStarted);
    window.addEventListener('sync-completed', handleSyncCompleted);
    window.addEventListener('sync-error', handleSyncError);

    // Initial sync check
    if (navigator.onLine && syncManager.getQueue().length > 0) {
      syncManager.syncAll();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-queue-updated', handleQueueUpdated);
      window.removeEventListener('sync-started', handleSyncStarted);
      window.removeEventListener('sync-completed', handleSyncCompleted);
      window.removeEventListener('sync-error', handleSyncError);
    };
  }, []); // Empty deps — event handlers use stable ref, no re-attachment

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, syncQueue }}>
      {children}
    </SyncContext.Provider>
  );
};
