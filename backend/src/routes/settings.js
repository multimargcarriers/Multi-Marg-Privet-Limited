const express = require("express");
const router = express.Router();
const os = require("os");

const { success, error } = require("../utils/response");
const { db } = require("../config/database");
const { getClient, getStatus: getRedisStatus, clearAllCache, getOrSet, delCache } = require("../config/redis");
const { uploadBase64, uploadCompanyStamp, deleteFile } = require("../config/cloudinary");
const { cleanupOrphanCloudinaryFiles } = require("../services/cloudinaryCleanupService");
const cloudinary = require("cloudinary").v2;
const { createUploadMiddleware } = require("../middleware/upload");

// Middleware to ensure user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};



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
    phone: "",
    companyStampUrl: ""
  },
  ui: {
    darkMode: false,
    compactTables: false,
    defaultSidebarOpen: true,
    accordionSidebar: true,
    expandAllDropdowns: false,
    fontSize: 100
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
    cloudinary: true,
    enableBulkDelete: false,
    enableCsvImport: true,
    enableGlobalBookingWindow: true,
    globalBookingWindowDays: 10
  },
  modules: {
    masters: true,
    rates: true,
    operations: true,
    billing: true,
    accounts: true,
    reports: true,
    uploads: true
  },
  system: {
    maintenanceMode: false
  }
};

// GET global config - accessible to all authenticated users
router.get("/config", async (req, res) => {
  try {
    if (!db || !db.mongoDb) {
      return success(res, "Returning defaults due to db disconnected", defaultSettings);
    }
    const collection = db.mongoDb.collection("system_settings");
    const settings = await getOrSet("global_config", async () => {
      const dbSettings = await collection.findOne({ type: "global_config" });
      if (!dbSettings) {
        const newSettings = { type: "global_config", ...defaultSettings };
        await collection.insertOne(newSettings);
        return newSettings;
      }
      return dbSettings;
    }, 3600);
    
    // Ensure new sections exist in older documents
    if (!settings.system) settings.system = { ...defaultSettings.system };
    if (!settings.integrations) settings.integrations = { ...defaultSettings.integrations };
    if (settings.integrations.enableBulkDelete === undefined) settings.integrations.enableBulkDelete = false;
    if (settings.integrations.enableCsvImport === undefined) settings.integrations.enableCsvImport = true;
    if (settings.integrations.enableGlobalBookingWindow === undefined) settings.integrations.enableGlobalBookingWindow = true;
    if (settings.integrations.globalBookingWindowDays === undefined) settings.integrations.globalBookingWindowDays = 10;
    
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
    
    // Cloudinary upload for company stamp if it's a new base64 image
    if (updateData.company && updateData.company.companyStampUrl && updateData.company.companyStampUrl.startsWith('data:image')) {
      try {
        const uploadResult = await uploadBase64(updateData.company.companyStampUrl, {
          folder: "multimargcarriers/stamps",
          publicId: `official_stamp_${Date.now()}`
        });
        
        if (uploadResult.success) {
          const oldConfig = await collection.findOne({ type: "global_config" });
          if (oldConfig && oldConfig.company && oldConfig.company.companyStampUrl && oldConfig.company.companyStampUrl !== uploadResult.url) {
            await deleteFile(oldConfig.company.companyStampUrl, "image");
          }
          updateData.company.companyStampUrl = uploadResult.url;
        } else {
          console.warn("[Settings] Cloudinary upload failed or disabled, keeping base64 stamp.", uploadResult.message);
        }
      } catch (uploadErr) {
        console.error("[Settings] Error uploading stamp to Cloudinary:", uploadErr.message);
      }
    }
    
    await collection.updateOne(
      { type: "global_config" },
      { $set: updateData },
      { upsert: true }
    );
    
    await delCache("global_config");
    
    const updatedSettings = await collection.findOne({ type: "global_config" });
    return success(res, "Configuration updated successfully", updatedSettings);
  } catch (err) {
    console.error("Error updating config", err);
    return error(res, err);
  }
});

// POST upload stamp directly via form-data
const stampUpload = createUploadMiddleware("stamps", { maxFileSize: 2 * 1024 * 1024 }); // 2MB limit

router.post("/upload-stamp", requireSuperAdmin, stampUpload.single("stampImage"), async (req, res) => {
  try {
    if (!req.file) {
      return error(res, { message: "No image file provided" }, 400);
    }

    if (!db || !db.mongoDb) return error(res, { message: "DB not connected" });

    // Upload to cloudinary
    const uploadResult = await uploadCompanyStamp(req.file.path);

    if (!uploadResult.success) {
      return error(res, { message: `Cloudinary upload failed: ${uploadResult.message}` }, 500);
    }

    const collection = db.mongoDb.collection("system_settings");

    // Delete old company stamp from Cloudinary if replacing
    const oldConfig = await collection.findOne({ type: "global_config" });
    if (oldConfig && oldConfig.company && oldConfig.company.companyStampUrl && oldConfig.company.companyStampUrl !== uploadResult.url) {
      await deleteFile(oldConfig.company.companyStampUrl, "image");
    }

    // Update the company stamp URL in MongoDB
    await collection.updateOne(
      { type: "global_config" },
      { $set: { "company.companyStampUrl": uploadResult.url } },
      { upsert: true }
    );

    await delCache("global_config");

    const updatedSettings = await collection.findOne({ type: "global_config" });
    return success(res, "Stamp uploaded successfully", updatedSettings);
  } catch (err) {
    console.error("Error uploading stamp:", err);
    return error(res, err);
  }
});

// POST clear cache
router.post("/clear-cache", requireSuperAdmin, async (req, res) => {
  try {
    await clearAllCache();
    return success(res, "System cache cleared successfully");
  } catch (err) {
    console.error("Error clearing cache", err);
    return error(res, err);
  }
});

// POST Cloudinary Cleanup (Deletes orphan files not in MongoDB)
router.post("/cloudinary-cleanup", requireSuperAdmin, async (req, res) => {
  try {
    const dryRun = req.body.dryRun === true;
    const result = await cleanupOrphanCloudinaryFiles({ dryRun });
    if (!result.success) {
      return error(res, { message: result.message || "Cloudinary cleanup failed" }, 500);
    }
    const message = dryRun 
      ? `Dry run complete. Found ${result.deletedOrphansCount} orphan file(s).` 
      : `Cloudinary cleanup complete. Deleted ${result.deletedOrphansCount} orphan file(s).`;
    return success(res, message, result);
  } catch (err) {
    console.error("Error during Cloudinary cleanup:", err);
    return error(res, err);
  }
});

// GET Cloudinary Cleanup Status (Dry Run preview)
router.get("/cloudinary-cleanup/status", requireSuperAdmin, async (req, res) => {
  try {
    const result = await cleanupOrphanCloudinaryFiles({ dryRun: true });
    return success(res, "Cloudinary orphan status retrieved", result);
  } catch (err) {
    console.error("Error checking Cloudinary orphans:", err);
    return error(res, err);
  }
});

module.exports = router;
