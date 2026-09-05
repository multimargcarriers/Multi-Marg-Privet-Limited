/**
 * smartSuggestions.js
 * Category-isolated intelligent suggestions engine.
 * 
 * Ranking Hierarchy:
 * 1. Most Recently Used First (ordered by latest timestamp) -> Tagged as 'recent'
 * 2. Highest Frequency / Max Used Next (ordered by total use count) -> Tagged as 'frequent'
 * 3. Preloaded Master Database values next
 * 
 * Strict Domain Categories:
 * - 'city': Origin, Destination, From, To, Station, Cities
 * - 'client': Client Name, Billed To, Consignor, Consignee, Party
 * - 'vendor': Vendor Name, Handover To, Transporter
 * - 'vehicle': Vehicle No, Truck No
 * - 'particular': Particulars, Material, Description
 */

import appDB from './appDB';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";
const STORAGE_KEY = 'smart_suggestions_categorized_v2';
const MAX_FREQUENT_WORDS_PER_CATEGORY = 250;
const MAX_RECENT_PER_CATEGORY = 20;

// Canonical Category Normalizer
export const resolveCategory = (rawCategory = 'general') => {
  const c = String(rawCategory || '').toLowerCase().replace(/[-_ ]/g, '');
  if (['origin', 'destination', 'from', 'to', 'city', 'cities', 'station', 'triporigin', 'tripdestination', 'lrorigin', 'lrdestination', 'pickupcity', 'deliverycity'].includes(c)) {
    return 'city';
  }
  if (['client', 'clientname', 'clients', 'billedto', 'party', 'consignor', 'consignee', 'billed_to', 'partyname'].includes(c)) {
    return 'client';
  }
  if (['vendor', 'vendorname', 'vendors', 'handoverto', 'transporter'].includes(c)) {
    return 'vendor';
  }
  if (['vehicle', 'vehicleno', 'truck', 'truckno'].includes(c)) {
    return 'vehicle';
  }
  if (['particular', 'particulars', 'material', 'description', 'goods', 'package', 'materialdetails'].includes(c)) {
    return 'particular';
  }
  return c || 'general';
};

// In-memory cache per canonical category
let suggestionsCache = {
  city: { recent: [], frequent: {}, preloaded: [] },
  client: { recent: [], frequent: {}, preloaded: [] },
  vendor: { recent: [], frequent: {}, preloaded: [] },
  vehicle: { recent: [], frequent: {}, preloaded: [] },
  particular: { recent: [], frequent: {}, preloaded: [] },
  general: { recent: [], frequent: {}, preloaded: [] }
};

export const isClientName = (text) => {
  const t = String(text || "").toUpperCase();
  return /\b(PVT|LTD|LIMITED|INDUSTRIES|ENTERPRISES|CORPORATION|CORP|COMPANY|AUTOMOTIVE|LOGISTICS|CARRIERS|HOLDINGS|VENTURES|SYSTEMS|LLP|INC|LLC|SEALS|EXHAUST|TECHNOLOGY|ENGINEERING|COMPONENTS|TRADERS|EXPORTS|IMPORTS|AGENCIES)\b/.test(t) || t.includes("UNIT -") || t.includes("UNIT-");
};

// Initialize cache from appDB / localStorage and sanitize cross-category contamination
const initSuggestions = () => {
  try {
    const raw = appDB.memGet(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(cat => {
          if (suggestionsCache[cat]) {
            suggestionsCache[cat] = {
              recent: Array.isArray(parsed[cat]?.recent) ? parsed[cat].recent : [],
              frequent: typeof parsed[cat]?.frequent === 'object' ? parsed[cat].frequent : {},
              preloaded: Array.isArray(parsed[cat]?.preloaded) ? parsed[cat].preloaded : []
            };
          }
        });
      }
    }

    // STRICT PURGE: Remove any company/client names mistakenly stored under 'city'
    if (suggestionsCache.city) {
      const leakedClients = [];
      
      suggestionsCache.city.recent = (suggestionsCache.city.recent || []).filter(r => {
        const text = typeof r === 'string' ? r : r.text;
        if (isClientName(text)) {
          leakedClients.push({ text, timestamp: r.timestamp || Date.now() });
          return false;
        }
        return true;
      });

      const newCityFrequent = {};
      Object.entries(suggestionsCache.city.frequent || {}).forEach(([k, count]) => {
        if (isClientName(k)) {
          leakedClients.push({ text: k, timestamp: Date.now() });
        } else {
          newCityFrequent[k] = count;
        }
      });
      suggestionsCache.city.frequent = newCityFrequent;

      suggestionsCache.city.preloaded = (suggestionsCache.city.preloaded || []).filter(p => !isClientName(p));

      // Move leaked items to client category
      if (leakedClients.length > 0 && suggestionsCache.client) {
        leakedClients.forEach(c => {
          if (!suggestionsCache.client.recent.some(r => (typeof r === 'string' ? r : r.text) === c.text)) {
            suggestionsCache.client.recent.unshift(c);
          }
          suggestionsCache.client.frequent[c.text] = (suggestionsCache.client.frequent[c.text] || 0) + 1;
        });
      }

      saveSuggestions();
    }
  } catch (e) {
    console.warn('[SmartSuggestions] init error:', e);
  }
};

initSuggestions();

const saveSuggestions = () => {
  try {
    appDB.set(STORAGE_KEY, suggestionsCache);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestionsCache));
  } catch (e) {
    console.warn('[SmartSuggestions] save error:', e);
  }
};

export const normalizeText = (txt) => {
  if (!txt) return "";
  return String(txt).trim().toUpperCase();
};

/**
 * Records a suggestion usage into its dedicated category.
 * Updates both recent timeline and frequency score.
 */
export const recordSuggestion = (rawCategory = 'general', rawText) => {
  const text = normalizeText(rawText);
  if (!text || text.length < 2) return;

  let cat = resolveCategory(rawCategory);
  
  // Guard against recording client names into city category
  if (cat === 'city' && isClientName(text)) {
    cat = 'client';
  }

  if (!suggestionsCache[cat]) {
    suggestionsCache[cat] = { recent: [], frequent: {}, preloaded: [] };
  }

  const catData = suggestionsCache[cat];

  // 1. Update Recent (Most recent first, unique)
  catData.recent = [
    { text, timestamp: Date.now() },
    ...catData.recent.filter(r => (typeof r === 'string' ? r : r.text) !== text)
  ].slice(0, MAX_RECENT_PER_CATEGORY);

  // 2. Update Frequency Count
  catData.frequent[text] = (catData.frequent[text] || 0) + 1;

  // Prune category frequent words if over threshold
  const catEntries = Object.entries(catData.frequent);
  if (catEntries.length > MAX_FREQUENT_WORDS_PER_CATEGORY) {
    catEntries.sort((a, b) => b[1] - a[1]);
    catData.frequent = Object.fromEntries(catEntries.slice(0, MAX_FREQUENT_WORDS_PER_CATEGORY));
  }

  saveSuggestions();
};

/**
 * Returns categorized suggestions strictly matching the category.
 * Output order:
 * 1. Recent used first (matching query if typed)
 * 2. Most frequently used next (highest count descending)
 * 3. Preloaded server database values next
 */
export const getSuggestions = (rawCategory = 'general', query = '', limit = 8) => {
  const cat = resolveCategory(rawCategory);
  const q = normalizeText(query);

  const catData = suggestionsCache[cat] || { recent: [], frequent: {}, preloaded: [] };

  const seen = new Set();
  const results = [];

  const isValidForCat = (item) => {
    if (!item) return false;
    if (cat === 'city' && isClientName(item)) return false;
    return true;
  };

  // 1. RECENT ITEMS FIRST
  const recentList = (catData.recent || []).map(r => (typeof r === 'string' ? r : r.text));
  for (const item of recentList) {
    if (!isValidForCat(item)) continue;
    if (q && !item.includes(q)) continue;
    if (!seen.has(item)) {
      seen.add(item);
      results.push({
        text: item,
        type: 'recent',
        score: 1000 + (catData.frequent[item] || 1)
      });
    }
  }

  // 2. MOST FREQUENTLY USED NEXT (sorted by frequency descending)
  const frequentEntries = Object.entries(catData.frequent || {})
    .sort((a, b) => b[1] - a[1]);

  for (const [item, count] of frequentEntries) {
    if (!isValidForCat(item)) continue;
    if (q && !item.includes(q)) continue;
    if (!seen.has(item)) {
      seen.add(item);
      results.push({
        text: item,
        type: count > 3 ? 'frequent' : 'normal',
        score: 500 + count
      });
    }
  }

  // 3. PRELOADED DATABASE OPTIONS NEXT
  const preloadedList = catData.preloaded || [];
  for (const item of preloadedList) {
    if (!isValidForCat(item)) continue;
    if (q && !item.includes(q)) continue;
    if (!seen.has(item)) {
      seen.add(item);
      results.push({
        text: item,
        type: 'normal',
        score: 100
      });
    }
  }

  // When query is typed, prioritize prefix matches
  if (q) {
    results.sort((a, b) => {
      const aStarts = a.text.startsWith(q);
      const bStarts = b.text.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return b.score - a.score;
    });
  }

  return results.slice(0, limit);
};

/**
 * Preload and merge suggestions from the backend API into category storage.
 */
export const preloadSuggestionsFromBackend = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await axios.get(`${API}/suggestions/recent`);
    if (res.data && res.data.success && res.data.data) {
      const serverData = res.data.data;
      
      const mapping = {
        city: serverData.city || serverData.origin || [],
        client: serverData.client || serverData.consignor || [],
        vendor: serverData.vendor || [],
        vehicle: serverData.vehicle || [],
        particular: serverData.particular || serverData.material || []
      };

      Object.entries(mapping).forEach(([cat, list]) => {
        if (!suggestionsCache[cat]) {
          suggestionsCache[cat] = { recent: [], frequent: {}, preloaded: [] };
        }
        if (Array.isArray(list)) {
          const validList = list.map(normalizeText).filter(Boolean);
          // Store preloaded items uniquely
          suggestionsCache[cat].preloaded = Array.from(new Set([
            ...suggestionsCache[cat].preloaded,
            ...validList
          ])).slice(0, 300);
        }
      });

      saveSuggestions();
    }
  } catch (e) {
    // Fail silently in offline mode
  }
};

// Trigger preloading in background
setTimeout(() => {
  preloadSuggestionsFromBackend();
}, 2000);

export default {
  recordSuggestion,
  getSuggestions,
  preloadSuggestionsFromBackend,
  normalizeText,
  resolveCategory
};
