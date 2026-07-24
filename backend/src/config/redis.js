/**
 * Redis Configuration & Client
 * Provides caching layer for faster data delivery
 */

const redis = require("redis");

let client = null;
let isConnected = false;
const USE_REDIS = process.env.USE_REDIS === "true";
const invalidationTimestamps = new Map();

const getRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
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
    client = redis.createClient({ url });

    client.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("[Redis] Connected successfully");
      isConnected = true;
    });

    client.on("end", () => {
      isConnected = false;
    });

    await client.connect();
    return client;
  } catch (error) {
    console.warn("[Redis] Failed to connect:", error.message);
    console.warn("[Redis] Continuing without caching layer.");
    isConnected = false;
    return null;
  }
}

const memoryCache = new Map();
const memoryCacheExpiry = new Map();

/**
 * Get cached data by key
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function getCache(key) {
  // 1. Ultra-fast Memory Cache
  if (memoryCache.has(key)) {
    if (Date.now() < memoryCacheExpiry.get(key)) {
      return memoryCache.get(key);
    } else {
      memoryCache.delete(key);
      memoryCacheExpiry.delete(key);
    }
  }

  // 2. Redis Fallback
  if (!client || !isConnected) return null;
  try {
    const data = await client.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      const ttl = await client.ttl(key);
      if (ttl > 0) {
        memoryCache.set(key, parsed);
        memoryCacheExpiry.set(key, Date.now() + ttl * 1000);
      }
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn(`[Redis] Get cache error for key "${key}":`, error.message);
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

  // Set Redis
  if (!client || !isConnected) return;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.warn(`[Redis] Set cache error for key "${key}":`, error.message);
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
  
  return client.del(key).catch(error => {
    console.warn(`[Redis] Del cache error for key "${key}":`, error.message);
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
  
  return client.keys(pattern).then(keys => {
    if (keys.length > 0) {
      return client.del(keys).then(() => {
        console.log(`[Redis] Invalidated ${keys.length} keys matching "${pattern}"`);
      });
    }
  }).catch(error => {
    console.warn(`[Redis] Invalidate pattern error for "${pattern}":`, error.message);
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

    await setCache(key, data, ttlSeconds).catch(err => console.warn(err));
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
      console.warn("[Redis] Error closing connection:", error.message);
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
  getClient: () => client,
};
