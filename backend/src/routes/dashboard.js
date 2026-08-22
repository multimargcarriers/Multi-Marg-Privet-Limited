const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { get_stats_1 } = require('../controllers/dashboardController');
const { post_sync_2 } = require('../controllers/analyticsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["dashboard", "all", "operations", "masters", "billing", "accounts", "reports"]));

router.get("/stats", asyncHandler(get_stats_1));
router.post("/sync", asyncHandler(post_sync_2));
router.post("/refresh", asyncHandler(post_sync_2));

module.exports = router;
