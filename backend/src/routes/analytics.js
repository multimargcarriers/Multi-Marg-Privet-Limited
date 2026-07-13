const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const doc = await db.collection("analytics").doc("summary").get();
    let data = doc.exists ? doc.data() : null;
    
    // If it doesn't exist yet, run it once
    if (!data) {
       data = await runAnalyticsAggregation();
    }
    
    return success(res, "Analytics fetched successfully", data);
  })
);

router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const data = await runAnalyticsAggregation();
    return success(res, "Analytics synced successfully", data);
  })
);

module.exports = router;
