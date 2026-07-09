import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Global memory cache for instant UI
const memCache = new Map();

// Override GET for instant cache + background update
const originalGet = axios.get;
axios.get = async function (url, config) {
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
axios.post = async function (...args) { clearCache(); return originalPost.apply(this, args); };

const originalPut = axios.put;
axios.put = async function (...args) { clearCache(); return originalPut.apply(this, args); };

const originalDelete = axios.delete;
axios.delete = async function (...args) { clearCache(); return originalDelete.apply(this, args); };

const originalPatch = axios.patch;
axios.patch = async function (...args) { clearCache(); return originalPatch.apply(this, args); };

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
