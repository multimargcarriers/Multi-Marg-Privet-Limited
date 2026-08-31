const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

/**
 * Initializes daily automated PDF cleanup job (runs at 3:00 AM daily)
 * Deletes downloaded PDFs in backend/uploads/downloaded_pdfs that are older than 15 days
 */
const initPdfCleanupCron = () => {
  cron.schedule("0 3 * * *", async () => {
    console.log("[Cron] Running daily downloaded PDFs cleanup job...");
    try {
      const dirPath = path.join(__dirname, "../../uploads/downloaded_pdfs");
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const files = fs.readdirSync(dirPath);
      const now = Date.now();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          const ageMs = now - stats.mtimeMs;
          if (ageMs > fifteenDaysMs) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (e) {
          console.error(`[Cron] Error checking file ${file}:`, e.message);
        }
      });

      if (deletedCount > 0) {
        console.log(`[Cron] PDF cleanup removed ${deletedCount} PDF file(s) older than 15 days.`);
      } else {
        console.log("[Cron] PDF cleanup completed. No old PDF files found.");
      }
    } catch (err) {
      console.error("[Cron] Downloaded PDFs cleanup error:", err.message);
    }
  });

  console.log("[Cron] Downloaded PDFs cleanup job scheduled for 3:00 AM daily.");
};

module.exports = {
  initPdfCleanupCron,
};
