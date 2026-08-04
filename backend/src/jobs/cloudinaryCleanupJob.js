const cron = require("node-cron");
const { cleanupOrphanCloudinaryFiles } = require("../services/cloudinaryCleanupService");

/**
 * Initializes daily automated Cloudinary orphan cleanup job (runs at 2:00 AM daily)
 */
const initCloudinaryCleanupCron = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("[Cron] Running daily Cloudinary orphan cleanup job...");
    try {
      const result = await cleanupOrphanCloudinaryFiles();
      if (result.success && result.deletedOrphansCount > 0) {
        console.log(`[Cron] Cloudinary cleanup removed ${result.deletedOrphansCount} orphan file(s).`);
      }
    } catch (err) {
      console.error("[Cron] Cloudinary orphan cleanup error:", err.message);
    }
  });

  console.log("[Cron] Cloudinary orphan cleanup job scheduled for 2:00 AM daily.");
};

module.exports = {
  initCloudinaryCleanupCron,
};
