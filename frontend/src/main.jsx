import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

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
