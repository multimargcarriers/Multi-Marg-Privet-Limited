import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import appDB from './utils/appDB.js'
import syncManager from './utils/syncManager.js'

// Add Axios Request Interceptor for Global Authorization and Data Lowercasing
const formatDataStringsToLowercase = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => formatDataStringsToLowercase(item));
  } else if (data !== null && typeof data === 'object') {
    const formattedObj = {};
    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        let value = data[key];
        
        if (typeof value === 'string' && !isTechnicalKey(key)) {
          if (!key.toLowerCase().includes('address')) {
            formattedObj[key] = value.toLowerCase();
          } else {
            formattedObj[key] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          formattedObj[key] = formatDataStringsToLowercase(value);
        } else {
          formattedObj[key] = value;
        }
      }
    }
    return formattedObj;
  }
  return data;
};

axios.interceptors.request.use((config) => {
  // Dynamically rewrite localhost to production VITE_API_URL if defined
  if (config.url && config.url.includes("http://localhost:5000") && import.meta.env.VITE_API_URL) {
    config.url = config.url.replace("http://localhost:5000", import.meta.env.VITE_API_URL);
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Format POST/PUT/PATCH payload strings to lowercase globally (except address & technical keys)
  if (config.data && typeof config.data === 'object' && ['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
    config.data = formatDataStringsToLowercase(config.data);
  }
  
  return config;
});

// Add Axios Response Interceptor for handling stale permissions seamlessly
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 403 (Forbidden) and we haven't already retried this request
    if (error.response?.status === 403 && !originalRequest._retry && !originalRequest.url.includes('/api/auth/me')) {
      originalRequest._retry = true;
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
      
      isRefreshing = true;
      const currentToken = localStorage.getItem('token');
      
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const refreshRes = await axios.get(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        
        if (refreshRes.data?.token) {
          localStorage.setItem('token', refreshRes.data.token);
          
          if (refreshRes.data.data) {
            appDB.set('user', refreshRes.data.data);
          }
          
          axios.defaults.headers.common['Authorization'] = 'Bearer ' + refreshRes.data.token;
          originalRequest.headers.Authorization = 'Bearer ' + refreshRes.data.token;
          
          processQueue(null, refreshRes.data.token);
          return axios(originalRequest);
        } else {
          processQueue(new Error('No token returned'));
          return Promise.reject(error);
        }
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Utility to recursively format data strings (CAPS, except addresses)
const isTechnicalKey = (key) => {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'id' || lowerKey === '_id' || lowerKey.endsWith('id') || lowerKey.endsWith('url') || lowerKey.endsWith('uri')) return true;
  // Skip keys that contain file/image/base64/cloudinary data to prevent corrupting binary data
  if (lowerKey.includes('data') || lowerKey.includes('base64') || lowerKey.includes('image') || lowerKey.includes('cloudinary') || lowerKey.includes('file')) return true;
  const ignoreList = [
    'email', 'password', 'token', 'status', 'filename', 'createdat', 'updatedat', 
    '__v', 'role', 'permission', 'type', 'gstslab', 'size', 'mimetype', 'paymentmode'
  ];
  return ignoreList.includes(lowerKey);
};

const formatTitleCase = (val) => {
  if (!val) return "";
  return val
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatDataStrings = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => formatDataStrings(item));
  } else if (data !== null && typeof data === 'object') {
    const formattedObj = {};
    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        let value = data[key];
        
        if (typeof value === 'string' && !isTechnicalKey(key)) {
          if (key.toLowerCase().includes('address')) {
            formattedObj[key] = formatTitleCase(value);
          } else {
            formattedObj[key] = value.toUpperCase();
          }
        } else if (typeof value === 'object' && value !== null) {
          formattedObj[key] = formatDataStrings(value);
        } else {
          formattedObj[key] = value;
        }
      }
    }
    return formattedObj;
  }
  return data;
};

// Add Axios Response Interceptor for Global Data Capitalization
axios.interceptors.response.use(
  (response) => {
    // Only format JSON responses
    if (response.data && typeof response.data === 'object') {
      response.data = formatDataStrings(response.data);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Persistent global cache using appDB for instant UI and offline support with TTL
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL for cached data
let forceFetchThreshold = 0;

// URL rewriter to support access from mobile devices on local network
const rewriteUrl = (url) => {
  if (typeof url !== 'string') return url;
  if (url.includes('localhost:5000') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return url.replace(/localhost:5000/g, `${window.location.hostname}:5000`);
  }
  return url;
};

// Override GET for instant cache + background update with UI refresh
const originalGet = axios.get;
axios.get = async function (url, config) {
  url = rewriteUrl(url);
  const cacheKey = `GET_${url}`;
  const now = Date.now();
  const cachedData = appDB.memGet(cacheKey);
  const cachedTimestamp = appDB.memGet(`${cacheKey}_timestamp`) || 0;
  const isStale = (now - cachedTimestamp) > CACHE_TTL_MS;
  
  // If offline, ALWAYS return cached data if available
  if (!navigator.onLine && cachedData) {
    return Promise.resolve({ data: cachedData });
  }
  
  // If cache is fresh and not invalidated by a recent mutation
  if (cachedData && cachedTimestamp >= forceFetchThreshold && !isStale) {
    return Promise.resolve({ data: cachedData });
  }
  
  // If cache is stale but not invalidated by mutation, return instant and fetch in background
  if (cachedData && cachedTimestamp >= forceFetchThreshold && isStale) {
    originalGet.call(this, url, { ...config, params: { ...config?.params, _t: now } })
      .then(res => {
        appDB.set(cacheKey, res.data);
        appDB.set(`${cacheKey}_timestamp`, Date.now());
        window.dispatchEvent(new CustomEvent('cache-refreshed', { detail: { url: cacheKey } }));
      })
      .catch(() => {});
    return Promise.resolve({ data: cachedData });
  }
  
  // First time fetch or forced refetch (due to mutation)
  try {
    const res = await originalGet.call(this, url, { ...config, params: { ...config?.params, _t: now } });
    appDB.set(cacheKey, res.data);
    appDB.set(`${cacheKey}_timestamp`, Date.now());
    return res;
  } catch (error) {
    // Graceful fallback to cache if network request fails (e.g. suddenly offline)
    if (cachedData) return Promise.resolve({ data: cachedData });
    throw error;
  }
};

// Invalidate cache on mutations (POST, PUT, DELETE) — ensures next GET blocks for fresh data
const clearCache = () => { 
  forceFetchThreshold = Date.now(); 
};

// Global Optimistic Delete: instantly removes item from local cache
const optimisticDelete = (idToDelete) => {
  if (!idToDelete || idToDelete.length < 3) return; // Ignore clear/all routes
  
  const keys = Array.from(appDB.memoryCache.keys()).filter(k => k.startsWith('GET_'));
  
  for (const key of keys) {
    const cachedObj = appDB.memGet(key);
    if (!cachedObj) continue;
    
    if (Array.isArray(cachedObj)) {
      const newArr = cachedObj.filter(item => item.id !== idToDelete && item._id !== idToDelete);
      if (newArr.length !== cachedObj.length) appDB.set(key, newArr);
    } 
    else if (cachedObj.data && Array.isArray(cachedObj.data)) {
      const newArr = cachedObj.data.filter(item => item.id !== idToDelete && item._id !== idToDelete);
      if (newArr.length !== cachedObj.data.length) {
        appDB.set(key, { ...cachedObj, data: newArr });
      }
    }
  }
};

window.addEventListener('sync-success-clear-cache', clearCache);

const originalPost = axios.post;
axios.post = async function (...args) { 
  if (!navigator.onLine) return syncManager.addRequest('post', rewriteUrl(args[0]), args[1]);
  if (syncManager.getQueue().length > 0) await syncManager.syncAll();
  args[0] = rewriteUrl(args[0]); clearCache(); return originalPost.apply(this, args); 
};

const originalPut = axios.put;
axios.put = async function (...args) { 
  if (!navigator.onLine) return syncManager.addRequest('put', rewriteUrl(args[0]), args[1]);
  if (syncManager.getQueue().length > 0) await syncManager.syncAll();
  args[0] = rewriteUrl(args[0]); clearCache(); return originalPut.apply(this, args); 
};

const originalDelete = axios.delete;
axios.delete = function (...args) { 
  const url = rewriteUrl(args[0]);
  const parts = url.split('?')[0].split('/');
  const idToDelete = parts[parts.length - 1];
  
  // 1. Optimistically remove from all caches
  optimisticDelete(idToDelete);
  
  // 2. Fire-and-forget background network execution
  const backgroundExecution = async () => {
    if (!navigator.onLine) {
      return syncManager.addRequest('delete', url, args[1]);
    }
    if (syncManager.getQueue().length > 0) {
      await syncManager.syncAll();
    }
    args[0] = url; 
    try {
      await originalDelete.apply(axios, args);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.warn("Background delete: Item already deleted on server (404)");
      } else {
        console.error("Background delete failed", e);
      }
    } finally {
      // Clear cache AFTER background process finishes so next navigation fetches real DB state
      clearCache(); 
    }
  };
  
  backgroundExecution().catch(e => console.error(e));
  
  // 3. Instantly resolve the promise to unblock the UI!
  return Promise.resolve({ data: { success: true, message: "Deleted optimistically" } });
};

const originalPatch = axios.patch;
axios.patch = async function (...args) { 
  if (!navigator.onLine) return syncManager.addRequest('patch', rewriteUrl(args[0]), args[1]);
  if (syncManager.getQueue().length > 0) await syncManager.syncAll();
  args[0] = rewriteUrl(args[0]); clearCache(); return originalPatch.apply(this, args); 
};

// Boot: preload IndexedDB into memory, then render React
appDB.preload().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {})
}
