const express = require("express");
const router = express.Router();
const { getRoot_1, get_awb_2, postRoot_3, delete_id_4, put_id_5, postBulk_6 } = require('../controllers/trackingController');
const { body } = require("express-validator");
const { asyncHandler } = require("../middleware/errorHandler");

// Bulk tracking update
router.post(
  "/bulk",
  asyncHandler(postBulk_6)
);

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
