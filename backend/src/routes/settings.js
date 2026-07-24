const express = require("express");
const router = express.Router();
const os = require("os");
const { authenticateToken } = require("../middleware/auth");
const { success, error } = require("../utils/response");
const { db } = require("../config/database");
const { getClient, getStatus: getRedisStatus } = require("../config/redis");
const cloudinary = require("cloudinary").v2;

// Middleware to ensure user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

router.use(authenticateToken);

router.get("/system-stats", requireSuperAdmin, async (req, res) => {
  try {
    const stats = {
      server: null,
      mongodb: null,
      redis: null,
      cloudinary: null
    };

    // 1. Server Stats (OS & Process)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const processMem = process.memoryUsage();
    
    stats.server = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      processUptime: process.uptime(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        processRss: processMem.rss,
        processHeapTotal: processMem.heapTotal,
        processHeapUsed: processMem.heapUsed
      }
    };

    // 2. MongoDB Stats
    if (db && db.mongoDb) {
      try {
        const dbStats = await db.mongoDb.command({ dbStats: 1 });
        const serverInfo = await db.mongoDb.admin().serverInfo();
        stats.mongodb = {
          version: serverInfo.version,
          dbName: dbStats.db,
          collections: dbStats.collections,
          objects: dbStats.objects,
          avgObjSize: dbStats.avgObjSize,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
        };
      } catch (err) {
        console.error("Failed to fetch MongoDB stats", err.message);
        stats.mongodb = { error: err.message };
      }
    }

    // 3. Redis Stats
    const redisStatus = getRedisStatus();
    if (redisStatus.enabled && redisStatus.connected) {
      const redisClient = getClient();
      if (redisClient) {
        try {
          const info = await redisClient.info("memory");
          const statsInfo = await redisClient.info("stats");
          
          // Parse info strings
          const parseRedisInfo = (str) => {
            const lines = str.split("\r\n");
            const result = {};
            for (const line of lines) {
              if (line && !line.startsWith("#")) {
                const parts = line.split(":");
                if (parts.length === 2) {
                  result[parts[0]] = parts[1];
                }
              }
            }
            return result;
          };
          
          const memInfo = parseRedisInfo(info);
          const statInfo = parseRedisInfo(statsInfo);
          
          stats.redis = {
            usedMemory: parseInt(memInfo.used_memory || 0),
            usedMemoryPeak: parseInt(memInfo.used_memory_peak || 0),
            usedMemoryDataset: parseInt(memInfo.used_memory_dataset || 0),
            totalSystemMemory: parseInt(memInfo.total_system_memory || 0),
            hits: parseInt(statInfo.keyspace_hits || 0),
            misses: parseInt(statInfo.keyspace_misses || 0),
          };
        } catch (err) {
          console.error("Failed to fetch Redis stats", err.message);
          stats.redis = { error: err.message };
        }
      }
    } else {
      stats.redis = { disabled: true };
    }

    // 4. Cloudinary Stats
    if (process.env.USE_CLOUDINARY === "true" && process.env.CLOUDINARY_API_SECRET) {
      try {
        const usage = await cloudinary.api.usage();
        stats.cloudinary = {
          plan: usage.plan,
          lastUpdated: usage.last_updated,
          bandwidth: usage.bandwidth,
          storage: usage.storage,
          requests: usage.requests,
          resources: usage.resources,
          derivatives: usage.derivatives
        };
      } catch (err) {
        console.error("Failed to fetch Cloudinary stats", err.message);
        stats.cloudinary = { error: err.message };
      }
    } else {
      stats.cloudinary = { disabled: true };
    }

    return success(res, "System stats fetched successfully", stats);
  } catch (err) {
    console.error("Error in /api/settings/system-stats", err);
    return error(res, err);
  }
});

const defaultSettings = {
  company: {
    name: "Multi Marg Carriers",
    gstin: "",
    address: "",
    email: "",
    phone: ""
  },
  ui: {
    darkMode: false,
    compactTables: false,
    defaultSidebarOpen: true
  },
  security: {
    sessionTimeout: 60,
    requireTwoFactor: false,
    restrictIp: false
  },
  billing: {
    defaultGst: 5,
    autoGenerateInvoice: true,
    enableRounding: true
  },
  notifications: {
    emailOnBooking: true,
    smsOnDispatch: false,
    dailyReports: true
  },
  integrations: {
    redis: true,
    cloudinary: true
  },
  modules: {
    masters: true,
    rates: true,
    operations: true,
    billing: true,
    accounts: true,
    reports: true,
    uploads: true
  }
};

// GET global config - accessible to all authenticated users
router.get("/config", async (req, res) => {
  try {
    if (!db || !db.mongoDb) {
      return success(res, "Returning defaults due to db disconnected", defaultSettings);
    }
    const collection = db.mongoDb.collection("system_settings");
    const settings = await collection.findOne({ type: "global_config" });
    
    if (!settings) {
      // Initialize with defaults if none exists
      const newSettings = { type: "global_config", ...defaultSettings };
      await collection.insertOne(newSettings);
      return success(res, "Global configuration fetched", newSettings);
    }
    
    return success(res, "Global configuration fetched", settings);
  } catch (err) {
    console.error("Error fetching config", err);
    return error(res, err);
  }
});

// PUT global config - restricted to SuperAdmin
router.put("/config", requireSuperAdmin, async (req, res) => {
  try {
    if (!db || !db.mongoDb) return error(res, { message: "DB not connected" });
    
    const collection = db.mongoDb.collection("system_settings");
    
    // Copy body and remove protected fields
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.type;
    
    await collection.updateOne(
      { type: "global_config" },
      { $set: updateData },
      { upsert: true }
    );
    
    const updatedSettings = await collection.findOne({ type: "global_config" });
    return success(res, "Configuration updated successfully", updatedSettings);
  } catch (err) {
    console.error("Error updating config", err);
    return error(res, err);
  }
});

// POST clear cache
router.post("/clear-cache", requireSuperAdmin, async (req, res) => {
  try {
    const redisClient = getClient();
    if (redisClient) {
      await redisClient.flushDb();
      return success(res, "Cache cleared successfully");
    } else {
      return error(res, { message: "Redis client not connected", statusCode: 503 });
    }
  } catch (err) {
    console.error("Error clearing cache", err);
    return error(res, err);
  }
});

module.exports = router;
