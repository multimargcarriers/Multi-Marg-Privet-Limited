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

exports.getRoot_1 = async (req, res) => {
  const doc = await db.collection("analytics").doc("summary").get();
  let data = doc.exists ? doc.data() : null;

  // If it doesn't exist yet, run it once
  if (!data) {
    data = await runAnalyticsAggregation();
  }
  return success(res, "Analytics fetched successfully", data);
};

exports.post_sync_2 = async (req, res) => {
  const data = await runAnalyticsAggregation();
  return success(res, "Analytics synced successfully", data);
};

