const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");
const { getRoot_1, post_sync_2 } = require('../controllers/analyticsController');
const { getAdvancedAnalytics } = require('../controllers/advancedAnalyticsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports","analytics"]));

router.get("/", asyncHandler(getRoot_1));
router.post("/sync", asyncHandler(post_sync_2));
router.get("/advanced", asyncHandler(getAdvancedAnalytics));

module.exports = router;
