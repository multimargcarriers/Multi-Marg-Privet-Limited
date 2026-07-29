const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");const { getRoot_1, get_search_2 } = require('../controllers/unbilledController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports","unbilled_reports"]));


const CACHE_KEY = "unbilled";

// Get unbilled bookings
router.get(
  "/",
  asyncHandler(getRoot_1














  )
);

// Search unbilled with filters
router.get(
  "/search",
  asyncHandler(get_search_2



















  )
);

module.exports = router;
