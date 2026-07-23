const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");const { getRoot_1, post_sync_2 } = require('../controllers/analyticsController');

router.get(
  "/",
  asyncHandler(getRoot_1









  )
);

router.post(
  "/sync",
  asyncHandler(post_sync_2


  )
);

module.exports = router;
