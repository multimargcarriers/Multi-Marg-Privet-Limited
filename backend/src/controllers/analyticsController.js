const {
  db
} = require("../config/database");
const {
  success,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  runAnalyticsAggregation
} = require("../jobs/analyticsJob");
const { delCache } = require("../config/redis");

exports.getRoot_1 = async (req, res) => {
  const data = await runAnalyticsAggregation();
  return success(res, "Analytics fetched successfully", data);
};

exports.post_sync_2 = async (req, res) => {
  const data = await runAnalyticsAggregation();
  await delCache("dashboard_stats");
  return success(res, "Analytics synced successfully", data);
};

