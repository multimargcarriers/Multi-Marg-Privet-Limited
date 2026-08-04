import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Add Axios Request Interceptor for Global Authorization
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Utility to recursively format data strings (CAPS, except addresses)
const isTechnicalKey = (key) => {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'id' || lowerKey === '_id' || lowerKey.endsWith('id') || lowerKey.endsWith('url') || lowerKey.endsWith('uri')) return true;
  const ignoreList = [
    'email', 'password', 'token', 'status', 'filename', 'createdat', 'updatedat', 
    '__v', 'role', 'permission', 'type', 'mode', 'gstslab', 'size', 'mimetype', 'paymentmode'
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

// Global memory cache for instant UI
const memCache = new Map();

// URL rewriter to support access from mobile devices on local network
const rewriteUrl = (url) => {
  if (typeof url !== 'string') return url;
  if (url.includes('localhost:5000') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return url.replace(/localhost:5000/g, `${window.location.hostname}:5000`);
  }
  return url;
};

// Override GET for instant cache + background update
const originalGet = axios.get;
axios.get = async function (url, config) {
  url = rewriteUrl(url);
  const cacheKey = url;
  if (memCache.has(cacheKey)) {
    // Fetch in background to keep fresh
    originalGet.call(this, url, { ...config, params: { ...config?.params, _t: Date.now() } })
      .then(res => memCache.set(cacheKey, res.data))
      .catch(() => {});
      
    // Return cached data instantly
    return Promise.resolve({ data: memCache.get(cacheKey) });
  }
  
  // First time fetch
  const res = await originalGet.call(this, url, { ...config, params: { ...config?.params, _t: Date.now() } });
  memCache.set(cacheKey, res.data);
  return res;
};

// Clear cache on mutations (POST, PUT, DELETE)
const clearCache = () => memCache.clear();

const originalPost = axios.post;
axios.post = async function (...args) { args[0] = rewriteUrl(args[0]); clearCache(); return originalPost.apply(this, args); };

const originalPut = axios.put;
axios.put = async function (...args) { args[0] = rewriteUrl(args[0]); clearCache(); return originalPut.apply(this, args); };

const originalDelete = axios.delete;
axios.delete = async function (...args) { args[0] = rewriteUrl(args[0]); clearCache(); return originalDelete.apply(this, args); };

const originalPatch = axios.patch;
axios.patch = async function (...args) { args[0] = rewriteUrl(args[0]); clearCache(); return originalPatch.apply(this, args); };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {})
}
