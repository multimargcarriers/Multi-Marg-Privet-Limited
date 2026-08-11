/**
 * appDB.js — IndexedDB wrapper with synchronous in-memory mirror.
 *
 * Architecture:
 *  - All data lives in IndexedDB (`multimarg_app` database, `app_cache` store).
 *  - On boot, `preload()` reads everything into an in-memory Map for instant sync reads.
 *  - `memGet(key)` reads from the Map (synchronous, zero latency).
 *  - `set(key, value)` writes to both the Map and IndexedDB (async, non-blocking).
 *  - `remove(key)` deletes from both.
 *  - `clear(keepKeys)` wipes everything except optional keys (used during logout).
 *
 * This eliminates the white-screen problem because React state initialization
 * can use memGet() synchronously, while IndexedDB handles persistence.
 */

const DB_NAME = 'multimarg_app';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';

// In-memory mirror for synchronous reads
const memoryCache = new Map();

let dbInstance = null;

/**
 * Open (or reuse) the IndexedDB connection.
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open failed:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Keys that should be migrated from localStorage on first run.
 * token and redirectUrl stay in localStorage (needed by axios interceptors synchronously).
 */
const MIGRATABLE_KEYS = [
  'user',
  'globalSettings',
  'incompleteNotifications',
  'totalIncompleteNotifications',
  'manifestFormDraft',
  'bookingFormDraft',
  'otpSession',
  'sidebar_open_sections',
  'bill_include_stamp',
  'bill_show_watermark',
  'app_font_size',
  'tripListEntries',
  'printSingleTripData',
  'mockTrips',
];

const withTimeout = (promise, ms, errMsg) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms))
  ]);
};

/**
 * Preload all IndexedDB entries into the in-memory cache.
 * Also performs one-time migration from localStorage for existing users.
 * Must be called BEFORE React renders.
 */
async function preload() {
  try {
    const db = await withTimeout(openDB(), 2000, "IndexedDB open timeout");

    // Load all existing IndexedDB entries into memory
    await withTimeout(new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          memoryCache.set(cursor.key, cursor.value);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    }), 3000, "IndexedDB read timeout");

    // One-time migration: if IndexedDB is empty but localStorage has data, migrate it
    const alreadyMigrated = memoryCache.has('__idb_migrated');
    if (!alreadyMigrated) {
      let migrated = false;
      for (const key of MIGRATABLE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw !== null && !memoryCache.has(key)) {
          // Try to parse JSON, fall back to raw string
          let value;
          try {
            value = JSON.parse(raw);
          } catch (_e) {
            value = raw;
          }
          memoryCache.set(key, value);
          migrated = true;
        }
      }

      if (migrated) {
        // Write migrated data to IndexedDB
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const key of MIGRATABLE_KEYS) {
          if (memoryCache.has(key)) {
            store.put(memoryCache.get(key), key);
          }
        }
        store.put(true, '__idb_migrated');
        await withTimeout(new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        }), 3000, "IndexedDB migration timeout");

        // Remove migrated keys from localStorage (keep token, redirectUrl)
        for (const key of MIGRATABLE_KEYS) {
          localStorage.removeItem(key);
        }
      }

      memoryCache.set('__idb_migrated', true);
    }
  } catch (err) {
    console.error('appDB preload failed, falling back to localStorage:', err);
    // Graceful fallback: load from localStorage into memory
    for (const key of MIGRATABLE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          memoryCache.set(key, JSON.parse(raw));
        } catch (_e) {
          memoryCache.set(key, raw);
        }
      }
    }
  }
}

/**
 * Synchronous read from the in-memory mirror.
 * Returns the parsed value (object/array/number/string) or null.
 */
function memGet(key) {
  const val = memoryCache.get(key);
  return val !== undefined ? val : null;
}

/**
 * Write a value to both memory and IndexedDB.
 * The memory write is synchronous; the IndexedDB write is fire-and-forget.
 */
function set(key, value) {
  memoryCache.set(key, value);

  // Async write to IndexedDB (non-blocking)
  openDB()
    .then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    })
    .catch((err) => {
      console.error(`appDB set('${key}') failed:`, err);
    });
}

/**
 * Remove a key from both memory and IndexedDB.
 */
function remove(key) {
  memoryCache.delete(key);

  openDB()
    .then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    })
    .catch((err) => {
      console.error(`appDB remove('${key}') failed:`, err);
    });
}

/**
 * Clear all data from memory and IndexedDB.
 * Optionally keep specific keys (e.g., during logout you may want to keep redirectUrl marker).
 */
async function clear(keepKeys = []) {
  // Preserve values for keys we want to keep
  const preserved = new Map();
  for (const k of keepKeys) {
    if (memoryCache.has(k)) {
      preserved.set(k, memoryCache.get(k));
    }
  }

  memoryCache.clear();

  // Restore preserved keys to memory
  for (const [k, v] of preserved) {
    memoryCache.set(k, v);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    // Re-write preserved keys
    for (const [k, v] of preserved) {
      store.put(v, k);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('appDB clear failed:', err);
  }
}

const appDB = { preload, memGet, set, remove, clear };
export default appDB;
