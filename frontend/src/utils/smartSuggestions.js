/**
 * smartSuggestions.js
 * Intelligent local suggestions engine using IndexedDB / localStorage + MongoDB/Redis live synchronization.
 * 
 * Features:
 * - Stores the last 10-20 recent entries per category/field.
 * - Stores up to 250 most frequent words/phrases per category or globally.
 * - Non-intrusive, zero-latency in-memory cache synchronized with IndexedDB.
 * - Auto-syncs with backend MongoDB/Redis data to preload recent & frequent historical records.
 * - Works completely offline & locally.
 */

import appDB from './appDB';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";
const STORAGE_KEY = 'smart_suggestions_db_v1';
const MAX_FREQUENT_WORDS_PER_CATEGORY = 250;
const MAX_RECENT_PER_CATEGORY = 15;

// In-memory mirror for instantaneous synchronous lookups
let suggestionsCache = {
  categories: {}, // e.g. { origin: { recent: ["NOKA", "CHAKAN"], frequent: { "NOKA": 14, "CHAKAN": 9 } } }
  globalWords: {} // e.g. { "NOKA": 14, "CHAKAN": 9, "PUNE": 22 }
};

// Initialize cache from appDB / localStorage
const initSuggestions = () => {
  try {
    const raw = appDB.memGet(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        suggestionsCache = {
          categories: parsed.categories || {},
          globalWords: parsed.globalWords || {}
        };
      }
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

/**
 * Normalizes input string (trims extra spaces, converts to uppercase for uniformity)
 */
export const normalizeText = (txt) => {
  if (!txt) return "";
  return String(txt).trim().toUpperCase();
};

/**
 * Records a suggestion usage for a specific category (e.g. 'origin', 'destination', 'consignor', 'consignee', 'particular', 'vehicle', 'client', 'general')
 */
export const recordSuggestion = (category = 'general', rawText) => {
  const text = normalizeText(rawText);
  if (!text || text.length < 2) return;

  const catKey = String(category || 'general').toLowerCase();

  if (!suggestionsCache.categories[catKey]) {
    suggestionsCache.categories[catKey] = {
      recent: [],
      frequent: {}
    };
  }

  const catData = suggestionsCache.categories[catKey];

  // 1. Update Recent (Last 15 unique entries)
  catData.recent = [text, ...catData.recent.filter(item => item !== text)].slice(0, MAX_RECENT_PER_CATEGORY);

  // 2. Update Category Frequent Count
  catData.frequent[text] = (catData.frequent[text] || 0) + 1;

  // Prune category frequent words if over 250
  const catEntries = Object.entries(catData.frequent);
  if (catEntries.length > MAX_FREQUENT_WORDS_PER_CATEGORY) {
    catEntries.sort((a, b) => b[1] - a[1]);
    catData.frequent = Object.fromEntries(catEntries.slice(0, MAX_FREQUENT_WORDS_PER_CATEGORY));
  }

  // 3. Update Global Words Frequency
  suggestionsCache.globalWords[text] = (suggestionsCache.globalWords[text] || 0) + 1;
  const globalEntries = Object.entries(suggestionsCache.globalWords);
  if (globalEntries.length > MAX_FREQUENT_WORDS_PER_CATEGORY * 2) {
    globalEntries.sort((a, b) => b[1] - a[1]);
    suggestionsCache.globalWords = Object.fromEntries(globalEntries.slice(0, MAX_FREQUENT_WORDS_PER_CATEGORY * 2));
  }

  saveSuggestions();
};

/**
 * Returns intelligent suggestions for a field based on typed query.
 * Combines recent selections and high-frequency words.
 */
export const getSuggestions = (category = 'general', query = '', limit = 8) => {
  const catKey = String(category || 'general').toLowerCase();
  const q = normalizeText(query);

  const catData = suggestionsCache.categories[catKey] || { recent: [], frequent: {} };
  const globalWords = suggestionsCache.globalWords || {};

  // Build pool of candidates with scored relevance
  const candidatesMap = new Map();

  // Add recent items
  catData.recent.forEach((item, idx) => {
    const freq = catData.frequent[item] || 1;
    // Score based on frequency + recency bonus
    candidatesMap.set(item, {
      text: item,
      frequency: freq,
      isRecent: true,
      score: freq * 2 + (MAX_RECENT_PER_CATEGORY - idx)
    });
  });

  // Add category frequent items
  Object.entries(catData.frequent).forEach(([item, freq]) => {
    if (!candidatesMap.has(item)) {
      candidatesMap.set(item, {
        text: item,
        frequency: freq,
        isRecent: false,
        score: freq * 2
      });
    }
  });

  // Add matching global words
  Object.entries(globalWords).forEach(([item, freq]) => {
    if (!candidatesMap.has(item)) {
      candidatesMap.set(item, {
        text: item,
        frequency: freq,
        isRecent: false,
        score: freq
      });
    }
  });

  let list = Array.from(candidatesMap.values());

  if (q) {
    list = list.filter(item => {
      const it = item.text;
      return it.startsWith(q) || it.includes(q);
    });

    // Sort: exact match or startsWith first, then higher frequency score
    list.sort((a, b) => {
      const aStarts = a.text.startsWith(q);
      const bStarts = b.text.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return b.score - a.score;
    });
  } else {
    // When no query is typed, sort by score (recent + high frequency)
    list.sort((a, b) => b.score - a.score);
  }

  return list.slice(0, limit);
};

/**
 * Syncs recent and frequent entries from backend MongoDB / Redis into local memory
 */
export const syncSuggestionsFromBackend = async () => {
  try {
    const token = localStorage.getItem("token") || appDB.memGet("token");
    if (!token) return;

    const res = await axios.get(`${API}/suggestions/recent`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data?.success && res.data.data) {
      const serverData = res.data.data;
      
      for (const [cat, words] of Object.entries(serverData)) {
        if (!Array.isArray(words)) continue;
        const catKey = cat.toLowerCase();
        if (!suggestionsCache.categories[catKey]) {
          suggestionsCache.categories[catKey] = { recent: [], frequent: {} };
        }
        const catObj = suggestionsCache.categories[catKey];
        
        words.forEach((word) => {
          const clean = normalizeText(word);
          if (clean && clean.length >= 2) {
            if (!catObj.frequent[clean]) {
              catObj.frequent[clean] = 1;
            }
            if (!catObj.recent.includes(clean) && catObj.recent.length < MAX_RECENT_PER_CATEGORY) {
              catObj.recent.push(clean);
            }
            suggestionsCache.globalWords[clean] = (suggestionsCache.globalWords[clean] || 0) + 1;
          }
        });
      }

      saveSuggestions();
    }
  } catch (e) {
    // Silent fail in offline or network blips
  }
};

// Trigger background sync when token is present
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncSuggestionsFromBackend();
  }, 2000);
}

/**
 * Returns the last 10 unique entries for a category
 */
export const getRecentHistory = (category = 'general', limit = 10) => {
  const catKey = String(category || 'general').toLowerCase();
  const catData = suggestionsCache.categories[catKey];
  if (!catData || !Array.isArray(catData.recent)) return [];
  return catData.recent.slice(0, limit);
};

export default {
  recordSuggestion,
  getSuggestions,
  getRecentHistory,
  syncSuggestionsFromBackend,
  normalizeText
};
