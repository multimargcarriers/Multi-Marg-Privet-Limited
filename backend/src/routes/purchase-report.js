const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");const { getRoot_1, get_summary_2 } = require('../controllers/purchase-reportController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports","purchase_reports"]));


const CACHE_KEY = "purchaseReport";

// Get purchase report
router.get(
  "/",
  asyncHandler(getRoot_1







































  )
);

// Get purchase summary
router.get(
  "/summary",
  asyncHandler(get_summary_2
























  )
);

module.exports = router;
