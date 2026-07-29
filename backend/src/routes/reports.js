const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");const { get_gst_1 } = require('../controllers/reportsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports"]));


const CACHE_KEY = "reports_gst";

// GST Report
router.get(
  "/gst",
  asyncHandler(get_gst_1



































  )
);

module.exports = router;
