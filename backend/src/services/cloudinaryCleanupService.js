const cloudinary = require("cloudinary").v2;
const { db } = require("../config/database");
const defaultAssets = require("../config/defaultAssets");
const { extractPublicIdFromUrl, deleteFile, isDefaultAsset } = require("../config/cloudinary");

/**
 * Recursively find all strings in an object/array that look like Cloudinary URLs or public IDs
 */
function extractUrlsAndIds(val, set) {
  if (typeof val === "string") {
    if (val.includes("cloudinary.com/")) {
      set.add(val);
      const publicId = extractPublicIdFromUrl(val);
      if (publicId) {
        set.add(publicId);
      }
    }
  } else if (Array.isArray(val)) {
    for (const item of val) {
      extractUrlsAndIds(item, set);
    }
  } else if (val && typeof val === "object" && !Buffer.isBuffer(val) && !(val instanceof Date)) {
    for (const v of Object.values(val)) {
      extractUrlsAndIds(v, set);
    }
  }
}

/**
 * Gather all Cloudinary URLs and public_ids actively stored in MongoDB and default assets
 */
async function getActiveMongoCloudinaryIdentifiers() {
  const activeSet = new Set();

  // 1. Add Default Avatars and Banners
  for (const url of (defaultAssets.DEFAULT_AVATARS || [])) {
    activeSet.add(url);
    const id = extractPublicIdFromUrl(url);
    if (id) activeSet.add(id);
  }
  for (const url of (defaultAssets.DEFAULT_BANNERS || [])) {
    activeSet.add(url);
    const id = extractPublicIdFromUrl(url);
    if (id) activeSet.add(id);
  }

  // 2. Scan all collections in MongoDB
  if (!db || !db.mongoDb) {
    console.warn("[CloudinaryCleanup] MongoDB client not ready yet");
    return activeSet;
  }

  try {
    const collections = await db.mongoDb.listCollections().toArray();
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const docs = await db.mongoDb.collection(colName).find({}).toArray();
      for (const doc of docs) {
        extractUrlsAndIds(doc, activeSet);
      }
    }
  } catch (err) {
    console.error("[CloudinaryCleanup] Error scanning MongoDB collections:", err.message);
  }

  return activeSet;
}

/**
 * Fetch all resources currently stored on Cloudinary
 */
async function getAllCloudinaryResources() {
  const allResources = [];
  const resourceTypes = ["image", "raw", "video"];

  for (const resourceType of resourceTypes) {
    let nextCursor = undefined;
    do {
      try {
        const res = await cloudinary.api.resources({
          type: "upload",
          resource_type: resourceType,
          max_results: 500,
          next_cursor: nextCursor
        });
        if (res && res.resources) {
          for (const item of res.resources) {
            allResources.push({
              public_id: item.public_id,
              secure_url: item.secure_url,
              resource_type: item.resource_type || resourceType,
              format: item.format,
              created_at: item.created_at
            });
          }
        }
        nextCursor = res.next_cursor;
      } catch (err) {
        // If resource_type has no files or errors out, continue
        break;
      }
    } while (nextCursor);
  }

  return allResources;
}

/**
 * Prune any Cloudinary file whose URL or public_id is NOT stored in MongoDB or defaultAssets
 * @param {object} [options={}] - Options object
 * @param {boolean} [options.dryRun=false] - If true, lists orphans without deleting them
 */
async function cleanupOrphanCloudinaryFiles(options = {}) {
  const { dryRun = false } = options;
  if (process.env.USE_CLOUDINARY !== "true") {
    return { success: false, message: "Cloudinary is disabled" };
  }

  console.log(`[CloudinaryCleanup] Starting scan for orphan Cloudinary assets (dryRun=${dryRun})...`);

  try {
    const activeSet = await getActiveMongoCloudinaryIdentifiers();
    const cloudResources = await getAllCloudinaryResources();

    console.log(`[CloudinaryCleanup] Found ${cloudResources.length} total files on Cloudinary. Active references in MongoDB/defaults: ${activeSet.size}`);

    let deletedCount = 0;
    const deletedOrphans = [];

    for (const res of cloudResources) {
      const publicId = res.public_id;
      const secureUrl = res.secure_url;

      // Check if this resource is referenced in MongoDB or defaults
      const isReferenced = activeSet.has(publicId) || activeSet.has(secureUrl);

      if (!isReferenced && !isDefaultAsset(secureUrl)) {
        if (dryRun) {
          console.log(`[CloudinaryCleanup] [DRY RUN] Would delete orphan: ${publicId} (${secureUrl})`);
          deletedCount++;
          deletedOrphans.push({ public_id: publicId, secure_url: secureUrl, result: "dry_run" });
        } else {
          console.log(`[CloudinaryCleanup] Orphan found! Deleting from Cloudinary: ${publicId} (${secureUrl})`);
          try {
            const delRes = await cloudinary.uploader.destroy(publicId, { resource_type: res.resource_type });
            if (delRes.result === "ok" || delRes.result === "not found") {
              deletedCount++;
              deletedOrphans.push({ public_id: publicId, secure_url: secureUrl, result: delRes.result });
            }
          } catch (delErr) {
            console.error(`[CloudinaryCleanup] Failed deleting orphan ${publicId}:`, delErr.message);
          }
        }
      }
    }

    console.log(`[CloudinaryCleanup] Cleanup complete (dryRun=${dryRun}). Orphan count: ${deletedCount}.`);

    return {
      success: true,
      dryRun,
      totalCloudinaryFiles: cloudResources.length,
      activeReferencedFiles: cloudResources.length - deletedCount,
      deletedOrphansCount: deletedCount,
      deletedOrphans
    };
  } catch (err) {
    console.error("[CloudinaryCleanup] Error during cleanup:", err.message);
    return { success: false, message: err.message };
  }
}

module.exports = {
  getActiveMongoCloudinaryIdentifiers,
  getAllCloudinaryResources,
  cleanupOrphanCloudinaryFiles
};
