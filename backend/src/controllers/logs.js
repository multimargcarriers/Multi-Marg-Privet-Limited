const { db } = require("../config/database");
const { logger } = require("../config/logger");

// Helper to format date string to local "YYYY-MM-DD HH:mm:ss" format for systemLogs
const formatToLocalLogDate = (dateInput, isEnd = false) => {
  if (!dateInput) return "";
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return isEnd ? `${dateInput} 23:59:59` : `${dateInput} 00:00:00`;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const pad = (num) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return isEnd ? `${year}-${month}-${day} 23:59:59` : `${year}-${month}-${day} 00:00:00`;
  } catch (e) {
    return "";
  }
};

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

/**
 * @desc    Delete a specific system log
 * @route   DELETE /api/logs/:id
 * @access  Private/SuperAdmin
 */
exports.deleteLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.collection("systemLogs").doc(id).delete(req.user);
    
    res.status(200).json({
      success: true,
      message: "Log deleted successfully"
    });
  } catch (error) {
    logger.error("Error deleting system log", { error: error.message });
    next(error);
  }
};

/**
 * @desc    Delete system logs older than a specific date
 * @route   DELETE /api/logs/date/:date
 * @access  Private/SuperAdmin
 */
exports.deleteLogsByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    const targetDate = formatToLocalLogDate(date, false);
    
    const snapshot = await db.collection("systemLogs").where("timestamp", "<", targetDate).get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      await db.collection("systemLogs").doc(doc.id).delete(req.user);
      count++;
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${count} old log(s)`
    });
  } catch (error) {
    logger.error("Error deleting old system logs", { error: error.message });
    next(error);
  }
};

/**
 * @desc    Advanced bulk delete system logs
 * @route   POST /api/logs/bulk-delete
 * @access  Private/SuperAdmin
 */
exports.bulkDeleteLogs = async (req, res, next) => {
  try {
    const { all, level, startDate, endDate } = req.body;
    let mongoFilter = {};

    if (!all) {
      if (level && level !== 'ALL') {
        mongoFilter.level = level.toLowerCase();
      }
      
      if (startDate || endDate) {
        mongoFilter.timestamp = {};
        if (startDate) {
          mongoFilter.timestamp.$gte = formatToLocalLogDate(startDate, false);
        }
        if (endDate) {
          mongoFilter.timestamp.$lte = formatToLocalLogDate(endDate, true);
        }
      }
    }

    // Direct MongoDB deletion for maximum performance!
    const result = await db.mongoDb.collection("systemLogs").deleteMany(mongoFilter);
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} log(s)`
    });
  } catch (error) {
    logger.error("Error bulk deleting system logs", { error: error.message });
    next(error);
  }
};

