const express = require("express");
const router = express.Router();
const os = require("os");
const crypto = require("crypto");

// Encrypt text using JWT_SECRET
const encryptKey = (text) => {
  if (!text) return "";
  try {
    if (text.includes(':')) return text; // already encrypted
    const secret = process.env.JWT_SECRET || "default_secret_key_for_multimarg";
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error("Encryption failed:", err);
    return text;
  }
};

// Decrypt text using JWT_SECRET
const decryptKey = (encryptedText) => {
  if (!encryptedText) return "";
  try {
    if (!encryptedText.includes(':')) return encryptedText;
    const secret = process.env.JWT_SECRET || "default_secret_key_for_multimarg";
    const key = crypto.createHash('sha256').update(secret).digest();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedTextBuffer = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedTextBuffer, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err);
    return encryptedText;
  }
};

const { success, error } = require("../utils/response");
const { db } = require("../config/database");
const { getClient, getStatus: getRedisStatus, clearAllCache, getOrSet, delCache } = require("../config/redis");
const { uploadBase64, uploadCompanyStamp, deleteFile } = require("../config/cloudinary");
const { cleanupOrphanCloudinaryFiles } = require("../services/cloudinaryCleanupService");
const cloudinary = require("cloudinary").v2;
const { createUploadMiddleware } = require("../middleware/upload");

// Middleware to ensure user is SuperAdmin or Admin
const requireSuperAdmin = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase().trim();
  const email = String(req.user?.email || "").toLowerCase().trim();
  if (role === "superadmin" || role === "admin" || email === "admin@multimarg.com" || email === "praveen.pr105@gmail.com") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin or Admin access required", statusCode: 403 });
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
    name: "MULTIMARG CARRIERS PVT. LTD.",
    gstin: "05AANCM3054E1ZN",
    address: "LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND",
    email: "info@multimarg.com",
    phone: "+91 5944-324033",
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
    globalBookingWindowDays: 10,
    enablePublicChatbot: false,
    backupGeminiKeys: []
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
    
    // Ensure company info is never blank or empty
    if (!settings.company) {
      settings.company = { ...defaultSettings.company };
    } else {
      if (!settings.company.name || settings.company.name.trim() === "" || settings.company.name === "Multi Marg Carriers") {
        settings.company.name = defaultSettings.company.name;
      }
      if (!settings.company.gstin || settings.company.gstin.trim() === "") {
        settings.company.gstin = defaultSettings.company.gstin;
      }
      if (!settings.company.address || settings.company.address.trim() === "") {
        settings.company.address = defaultSettings.company.address;
      }
      if (!settings.company.email || settings.company.email.trim() === "") {
        settings.company.email = defaultSettings.company.email;
      }
      if (!settings.company.phone || settings.company.phone.trim() === "") {
        settings.company.phone = defaultSettings.company.phone;
      }
    }

    // Ensure new sections exist in older documents
    if (!settings.system) settings.system = { ...defaultSettings.system };
    if (!settings.integrations) settings.integrations = { ...defaultSettings.integrations };
    if (settings.integrations.enableBulkDelete === undefined) settings.integrations.enableBulkDelete = false;
    if (settings.integrations.enableCsvImport === undefined) settings.integrations.enableCsvImport = true;
    if (settings.integrations.enableGlobalBookingWindow === undefined) settings.integrations.enableGlobalBookingWindow = true;
    if (settings.integrations.globalBookingWindowDays === undefined) settings.integrations.globalBookingWindowDays = 10;
    if (settings.integrations.enablePublicChatbot === undefined) settings.integrations.enablePublicChatbot = false;
    if (!settings.integrations.backupGeminiKeys) settings.integrations.backupGeminiKeys = [];
    
    // Mask keys for browser client transmission
    const maskedKeys = (settings.integrations.backupGeminiKeys || []).map((k, idx) => {
      const dec = decryptKey(k);
      if (!dec) return `API KEY ${idx + 1} (MASKED)`;
      return `${dec.substring(0, 8)}... (MASKED)`;
    });

    const clientSettings = {
      ...settings,
      integrations: {
        ...settings.integrations,
        backupGeminiKeys: maskedKeys
      }
    };
    
    return success(res, "Global configuration fetched", clientSettings);
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
    const existingConfig = (await collection.findOne({ type: "global_config" })) || {};
    
    // Copy body and remove protected fields
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.type;

    // Encrypt new backup Gemini keys, while keeping unmodified masked keys intact
    if (updateData.integrations && Array.isArray(updateData.integrations.backupGeminiKeys)) {
      const dbKeys = existingConfig.integrations?.backupGeminiKeys || [];
      const newKeys = updateData.integrations.backupGeminiKeys.map((k, idx) => {
        if (k.includes('(MASKED)')) {
          return dbKeys[idx] || "";
        } else {
          return encryptKey(k);
        }
      }).filter(k => k !== "");
      updateData.integrations.backupGeminiKeys = newKeys;
    }
    
    // Merge company carefully - never accidentally blank out fields if incoming is empty/missing
    let mergedCompany = {
      ...defaultSettings.company,
      ...(existingConfig.company || {})
    };

    if (updateData.company && typeof updateData.company === 'object') {
      const incoming = updateData.company;
      mergedCompany = {
        name: incoming.name && incoming.name.trim() !== "" ? incoming.name.trim() : mergedCompany.name,
        gstin: incoming.gstin && incoming.gstin.trim() !== "" ? incoming.gstin.trim() : mergedCompany.gstin,
        address: incoming.address && incoming.address.trim() !== "" ? incoming.address.trim() : mergedCompany.address,
        email: incoming.email && incoming.email.trim() !== "" ? incoming.email.trim() : mergedCompany.email,
        phone: incoming.phone && incoming.phone.trim() !== "" ? incoming.phone.trim() : mergedCompany.phone,
        companyStampUrl: incoming.companyStampUrl !== undefined ? incoming.companyStampUrl : mergedCompany.companyStampUrl
      };
      updateData.company = mergedCompany;
    } else {
      updateData.company = mergedCompany;
    }
    
    // Cloudinary upload for company stamp if it's a new base64 image
    if (updateData.company && updateData.company.companyStampUrl && updateData.company.companyStampUrl.startsWith('data:image')) {
      try {
        const uploadResult = await uploadBase64(updateData.company.companyStampUrl, {
          folder: "multimargcarriers/stamps",
          publicId: `official_stamp_${Date.now()}`
        });
        
        if (uploadResult.success) {
          if (existingConfig.company && existingConfig.company.companyStampUrl && existingConfig.company.companyStampUrl !== uploadResult.url) {
            await deleteFile(existingConfig.company.companyStampUrl, "image");
          }
          updateData.company.companyStampUrl = uploadResult.url;
        } else {
          console.warn("[Settings] Cloudinary upload failed or disabled, keeping base64 stamp.", uploadResult.message);
        }
      } catch (uploadErr) {
        console.error("[Settings] Error uploading stamp to Cloudinary:", uploadErr.message);
      }
    }
    
    // Merge all top-level objects so partial updates don't obliterate other settings
    const finalDoc = {
      ...defaultSettings,
      ...existingConfig,
      ...updateData,
      type: "global_config",
      company: updateData.company
    };

    await collection.updateOne(
      { type: "global_config" },
      { $set: finalDoc },
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

// POST upload stamp directly via JSON base64 or form-data
const stampUpload = createUploadMiddleware("stamps", { maxFileSize: 5 * 1024 * 1024 }); // 5MB limit

router.post("/upload-stamp", requireSuperAdmin, (req, res, next) => {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    stampUpload.any()(req, res, (err) => {
      if (err) {
        console.error("[Multer Upload Error]:", err);
        return error(res, { message: err.message || "Failed to process image file" }, 400);
      }
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    const base64Data = req.body?.stampData || req.body?.imageData || req.body?.base64;

    if (!file && !base64Data) {
      return error(res, { message: "No image file provided. Please choose an image file." }, 400);
    }

    if (!db || !db.mongoDb) return error(res, { message: "Database connection unavailable" }, 500);

    let stampUrl = "";

    if (base64Data) {
      // 1. Upload base64 to Cloudinary
      try {
        const uploadResult = await uploadBase64(base64Data, {
          folder: "stamps",
          publicId: `official_stamp_${Date.now()}`,
          overwrite: true
        });
        if (uploadResult && uploadResult.success && uploadResult.url) {
          stampUrl = uploadResult.url;
        }
      } catch (cErr) {
        console.warn("[Cloudinary Base64 Error]:", cErr.message);
      }

      // 2. Fallback to saving base64 locally on disk if Cloudinary is not enabled/reachable
      if (!stampUrl) {
        try {
          const destDir = path.resolve(process.cwd(), "uploads", "stamps");
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const ext = matches && matches[1] ? (matches[1].split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg") : "png";
          const rawData = matches ? matches[2] : base64Data;
          const fileName = `stamp_${Date.now()}.${ext}`;
          const filePath = path.join(destDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(rawData, "base64"));
          stampUrl = `/uploads/stamps/${fileName}`;
        } catch (fsErr) {
          console.error("Local base64 disk write error:", fsErr);
        }
      }
    } else if (file) {
      stampUrl = `/uploads/stamps/${file.filename}`;
      try {
        const uploadResult = await uploadCompanyStamp(file.path);
        if (uploadResult && uploadResult.success && uploadResult.url) {
          stampUrl = uploadResult.url;
        }
      } catch (cErr) {
        console.warn("[Stamp Upload] Cloudinary upload failed, keeping local file:", cErr.message);
      }
    }

    if (!stampUrl) {
      return error(res, { message: "Failed to store stamp image" }, 500);
    }

    const collection = db.mongoDb.collection("system_settings");

    // Clean up old Cloudinary file if replacing
    const oldConfig = await collection.findOne({ type: "global_config" });
    if (oldConfig && oldConfig.company && oldConfig.company.companyStampUrl && oldConfig.company.companyStampUrl !== stampUrl) {
      if (oldConfig.company.companyStampUrl.includes("cloudinary.com")) {
        try {
          await deleteFile(oldConfig.company.companyStampUrl, "image");
        } catch (_delErr) {}
      }
    }

    // Update the company stamp URL in MongoDB
    await collection.updateOne(
      { type: "global_config" },
      { $set: { "company.companyStampUrl": stampUrl, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    await delCache("global_config");

    const updatedSettings = await collection.findOne({ type: "global_config" });
    return success(res, "Stamp uploaded successfully", updatedSettings);
  } catch (err) {
    console.error("Error in /upload-stamp route:", err);
    return error(res, { message: err.message || "Failed to save stamp image" }, 500);
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
