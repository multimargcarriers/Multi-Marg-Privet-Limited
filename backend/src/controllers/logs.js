const { mockData } = require("../config/firebase");
const { logger } = require("../config/logger");

/**
 * @desc    Get system logs
 * @route   GET /api/logs
 * @access  Private/SuperAdmin
 */
exports.getSystemLogs = async (req, res, next) => {
  try {
    // Reverse the logs so the newest are at the top
    const logs = (mockData.systemLogs || []).slice().reverse();
    
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
