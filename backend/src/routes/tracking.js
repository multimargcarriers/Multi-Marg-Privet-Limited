const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { getRoot_1, get_awb_2, postRoot_3, delete_id_4, put_id_5 } = require('../controllers/trackingController');

const CACHE_KEY = "tracking";

// Get all tracking entries
router.get(
  "/",
  asyncHandler(getRoot_1)
);

// Get tracking by AWB
router.get(
  "/:awb",
  asyncHandler(get_awb_2)
);

// Create tracking entry
router.post(
  "/",
  [
    body("awb").notEmpty().withMessage("AWB number is required"),
    body("status").notEmpty().withMessage("Status is required"),
    body("location").notEmpty().withMessage("Location is required")
  ],
  asyncHandler(postRoot_3)
);

// Delete tracking entry
router.delete(
  "/:id",
  asyncHandler(delete_id_4)
);

// Edit tracking entry
router.put(
  "/:id",
  [
    body("status").notEmpty().withMessage("Status is required"),
    body("location").notEmpty().withMessage("Location is required")
  ],
  asyncHandler(put_id_5)
);

module.exports = router;
