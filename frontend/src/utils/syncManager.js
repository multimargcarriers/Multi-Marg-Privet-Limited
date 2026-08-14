import appDB from './appDB';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class SyncManager {
  constructor() {
    this.isSyncing = false;
  }

  getQueue() {
    return appDB.memGet('offline_queue') || [];
  }

  setQueue(queue) {
    appDB.set('offline_queue', queue);
    window.dispatchEvent(new CustomEvent('sync-queue-updated', { detail: queue }));
  }

  async addRequest(method, url, data) {
    const queue = this.getQueue();
    // Generate a temporary ID if it's a creation (POST)
    const tempId = method === 'post' ? `offline_${uuidv4()}` : null;
    
    // Inject the temporary ID into the data payload so the backend uses it
    let payload = data;
    if (tempId && typeof data === 'object') {
      payload = { ...data, id: tempId };
    }

    const request = {
      id: uuidv4(),
      method,
      url,
      data: payload,
      tempId,
      timestamp: Date.now(),
      status: 'pending',
    };

    queue.push(request);
    this.setQueue(queue);

    return {
      data: {
        success: true,
        message: 'Saved offline. Will sync when back online.',
        data: payload,
        isOfflinePending: true,
      }
    };
  }

  async syncAll() {
    if (this.isSyncing || !navigator.onLine) return;
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-started'));

    const remainingQueue = [...queue];

    for (const req of queue) {
      if (req.status === 'synced') continue;

      try {
        const config = {
          method: req.method,
          url: req.url,
          data: req.data,
          headers: {
            'X-Offline-Sync': 'true'
          }
        };

        await axios(config);
        
        // Remove from queue on success
        const index = remainingQueue.findIndex(r => r.id === req.id);
        if (index > -1) remainingQueue.splice(index, 1);
        
      } catch (error) {
        // If it's a 4xx error (validation), we probably can't automatically fix it.
        // For now, keep it in queue if it's a network error, otherwise mark failed.
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          console.error('Offline request failed validation:', error);
          const index = remainingQueue.findIndex(r => r.id === req.id);
          if (index > -1) remainingQueue.splice(index, 1);
          // Dispatch error event
          window.dispatchEvent(new CustomEvent('sync-error', { detail: { request: req, error } }));
        }
      }
    }

    this.setQueue(remainingQueue);
    this.isSyncing = false;
    window.dispatchEvent(new CustomEvent('sync-completed'));
  }
}

const syncManager = new SyncManager();
export default syncManager;
