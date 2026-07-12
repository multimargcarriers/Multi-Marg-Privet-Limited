const { db } = require("../config/firebase");
const { logger } = require("../config/logger");

/**
 * @desc    Get system logs
 * @route   GET /api/logs
 * @access  Private/SuperAdmin
 */
exports.getSystemLogs = async (req, res, next) => {
  try {
    const snapshot = await db.collection("systemLogs").orderBy("timestamp", "desc").get();
    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    logger.error("Error fetching system logs", { error: error.message });
    next(error);
  }
};
