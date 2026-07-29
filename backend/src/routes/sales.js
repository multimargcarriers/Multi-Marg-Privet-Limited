const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");const { getRoot_1, get_summary_2 } = require('../controllers/salesController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports","sales_reports"]));


const CACHE_KEY = "sales";

// Get sales report
router.get(
  "/",
  asyncHandler(getRoot_1




















































  )
);

// Get sales summary
router.get(
  "/summary",
  asyncHandler(get_summary_2































  )
);

module.exports = router;
