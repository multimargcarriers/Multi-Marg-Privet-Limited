const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");const { get_stats_1 } = require('../controllers/dashboardController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["dashboard"]));


router.get(
  "/stats",
  asyncHandler(get_stats_1









  )
);

module.exports = router;
