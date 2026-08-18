/**
 * Redis Configuration & Client
 * Provides caching layer with robust OOM handling, query timeouts, and auto-flushing.
 */

const redis = require("redis");

let client = null;
let isConnected = false;
const USE_REDIS = process.env.USE_REDIS === "true";
const invalidationTimestamps = new Map();

// Local Memory Cache
const memoryCache = new Map();
const memoryCacheExpiry = new Map();

/**
 * Periodically prunes expired items and caps memory cache size to prevent process OOM.
 */
function pruneExpiredMemoryCache() {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheExpiry.entries()) {
    if (now >= expiry) {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }

  // Cap local Map storage at 1000 items to limit memory footprint
  if (memoryCache.size > 1000) {
    const keys = Array.from(memoryCache.keys());
    const toRemove = keys.slice(0, memoryCache.size - 800); // Leave the 800 freshest
    for (const k of toRemove) {
      memoryCache.delete(k);
      memoryCacheExpiry.delete(k);
    }
    console.log(`[Memory Cache] Evicted ${toRemove.length} old entries to control size (Size: ${memoryCache.size})`);
  }
}

// Setup background interval daemon
const pruneInterval = setInterval(pruneExpiredMemoryCache, 30000);
if (pruneInterval.unref) pruneInterval.unref();

/**
 * Timeout wrapper for promise-based operations
 */
const withTimeout = (promise, ms, defaultValue = null) => {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Redis] Command timed out after ${ms}ms. Bypassing Redis cache.`);
      resolve(defaultValue);
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

const getRedisUrl = () => {
  const url = process.env.REDIS_URL;
  if (
    url &&
    typeof url === "string" &&
    url.trim() !== "" &&
    url !== "undefined" &&
    url !== "null" &&
    (url.startsWith("redis://") || url.startsWith("rediss://"))
  ) {
    return url;
  }
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD;
  if (password) return `redis://:${password}@${host}:${port}`;
  return `redis://${host}:${port}`;
};

/**
 * Initialize Redis connection
 */
async function initRedis() {
  if (!USE_REDIS) {
    console.log("[Redis] Disabled. Set USE_REDIS=true to enable caching.");
    return null;
  }

  try {
    const url = getRedisUrl();
    client = redis.createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff reconnect strategy that doesn't terminate permanently
          const delay = Math.min(1000 * Math.pow(2, retries), 15000);
          console.warn(`[Redis] Connection offline. Reconnection attempt #${retries} in ${delay}ms...`);
          return delay;
        }
      }
    });

    client.on("error", (err) => {
      console.log("[Redis] Connection error:", err.message);
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("[Redis] Connected successfully");
      isConnected = true;
    });

    client.on("ready", async () => {
      // Attempt to configure eviction policy automatically if permitted by the cloud provider
      try {
        await client.configSet("maxmemory-policy", "allkeys-lru");
        console.log("[Redis] Auto-configured maxmemory-policy to allkeys-lru");
      } catch (err) {
        console.log("[Redis] Auto-configuration of maxmemory-policy bypassed (cloud provider restriction):", err.message);
      }
    });

    client.on("end", () => {
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (error) {
    console.log("[Redis] Failed to connect:", error.message);
    console.log("[Redis] Continuing without caching layer.");
    isConnected = false;
    return null;
  }
}

/**
 * Get cached data by key
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function getCache(key) {
  // 1. Memory Cache
  if (memoryCache.has(key)) {
    if (Date.now() < memoryCacheExpiry.get(key)) {
      return memoryCache.get(key);
    } else {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }

  // 2. Redis Fallback with 500ms timeout
  if (!client || !isConnected) return null;
  try {
    const data = await withTimeout(client.get(key), 500, null);
    if (data) {
      const parsed = JSON.parse(data);
      const ttl = await withTimeout(client.ttl(key), 300, 0);
      if (ttl > 0) {
        memoryCache.set(key, parsed);
        memoryCacheExpiry.set(key, Date.now() + ttl * 1000);
      }
      return parsed;
    }
    return null;
  } catch (error) {
    console.log(`[Redis] Get cache error for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set cached data with TTL
 * @param {string} key
 * @param {object} value
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 min)
 */
async function setCache(key, value, ttlSeconds = 300) {
  // Set memory cache
  memoryCache.set(key, value);
  memoryCacheExpiry.set(key, Date.now() + ttlSeconds * 1000);

  // Set Redis with 500ms timeout
  if (!client || !isConnected) return;
  try {
    await withTimeout(client.setEx(key, ttlSeconds, JSON.stringify(value)), 500, null);
  } catch (error) {
    console.error(`[Redis] Set cache error for key "${key}":`, error.message);
    
    // Auto-flush cache on OOM or quota-exceeded write failures
    const isOom = error.message && (
      error.message.includes("OOM") || 
      error.message.includes("maxmemory") || 
      error.message.includes("quota exceeded") ||
      error.message.includes("out of memory")
    );
    
    if (isOom) {
      console.warn(`[Redis] OOM/Maxmemory write failure detected for key "${key}". Triggering automatic clearAllCache().`);
      clearAllCache().catch(err => console.error("[Redis] Auto-flush execution failed:", err.message));
    }
  }
}

/**
 * Delete cached data by key
 * @param {string} key
 */
function delCache(key) {
  invalidationTimestamps.set(key, Date.now());
  
  memoryCache.delete(key);
  memoryCacheExpiry.delete(key);

  if (!client || !isConnected) return Promise.resolve();
  
  return withTimeout(client.del(key), 500, null).catch(error => {
    console.log(`[Redis] Del cache error for key "${key}":`, error.message);
  });
}

/**
 * Invalidate cache by pattern (e.g., "clients:*")
 * @param {string} pattern
 */
function invalidatePattern(pattern) {
  memoryCache.clear();
  memoryCacheExpiry.clear();

  if (!client || !isConnected) return Promise.resolve();
  
  return withTimeout(
    client.keys(pattern).then(keys => {
      if (keys.length > 0) {
        return client.del(keys).then(() => {
          console.log(`[Redis] Invalidated ${keys.length} keys matching "${pattern}"`);
        });
      }
    }),
    800,
    null
  ).catch(error => {
    console.log(`[Redis] Invalidate pattern error for "${pattern}":`, error.message);
  });
}

/**
 * Get or set cache (memoization pattern)
 * @param {string} key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttlSeconds
 * @returns {Promise<object>}
 */
async function getOrSet(key, fetchFn, ttlSeconds = 300) {
  const cached = await getCache(key);
  if (cached !== null) {
    console.log(`[Memory/Redis] Cache HIT for "${key}"`);
    return cached;
  }
  console.log(`[Memory/Redis] Cache MISS for "${key}"`);
  
  const fetchStartTime = Date.now();
  const data = await fetchFn();
  
  if (data) {
    const lastInvalidated = invalidationTimestamps.get(key) || 0;
    if (lastInvalidated > fetchStartTime) {
      console.log(`[Redis] Skipped setting cache for "${key}" due to concurrent invalidation`);
      return data;
    }

    await setCache(key, data, ttlSeconds).catch(err => console.log(err));
  }
  return data;
}

/**
 * Get Redis connection status
 */
function getStatus() {
  return {
    enabled: USE_REDIS,
    connected: isConnected,
  };
}

/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
  if (client && isConnected) {
    try {
      await client.quit();
      console.log("[Redis] Connection closed gracefully");
    } catch (error) {
      console.log("[Redis] Error closing connection:", error.message);
    }
  }
}

async function clearAllCache() {
  memoryCache.clear();
  memoryCacheExpiry.clear();
  invalidationTimestamps.clear();

  if (client && isConnected) {
    try {
      await client.flushDb();
      console.log("[Redis] Flushed DB");
    } catch (error) {
      console.log("[Redis] Error flushing DB:", error.message);
    }
  }
}

module.exports = {
  initRedis,
  getCache,
  setCache,
  delCache,
  invalidatePattern,
  getOrSet,
  getStatus,
  closeRedis,
  clearAllCache,
  getClient: () => client,
};
