const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { generateLRNumber } = require("../utils/helpers");const { postRoot_1, getRoot_2, get_id_3, put_id_4, delete_id_5 } = require('../controllers/bookingsController');

const CACHE_KEY = "bookings";

// Create Booking (LR)
router.post(
  "/",
  [
  body("client").notEmpty().withMessage("Client name is required"),
  body("dispatch_date").notEmpty().withMessage("Date is required"),
  body("mode").notEmpty().withMessage("Mode is required"),
  body("consignor").notEmpty().withMessage("Consignor is required"),
  body("consignee").notEmpty().withMessage("Consignee is required"),
  body("origin").notEmpty().withMessage("Origin is required"),
  body("destination").notEmpty().withMessage("Destination is required"),
  body("box").notEmpty().withMessage("Box is required"),
  body("actual_wt").notEmpty().withMessage("Actual weight is required"),
  body("charge_wt").notEmpty().withMessage("Charge weight is required"),
  body("freight_charge").notEmpty().withMessage("Freight charge is required"),
  body("awb_charge").notEmpty().withMessage("Awb charge is required"),
  body("pickup_charge").notEmpty().withMessage("Pickup charge is required"),
  body("delivery_charge").notEmpty().withMessage("Delivery charge is required"),
  body("packaging_charge").notEmpty().withMessage("Packaging charge is required"),
  body("handling_charge").notEmpty().withMessage("Handling charge is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("insuredBy").notEmpty().withMessage("Insured By is required"),
  body("remarks").notEmpty().withMessage("Remarks are required")],

  asyncHandler(postRoot_1
















  )
);

// Get all bookings
router.get(
  "/",
  asyncHandler(getRoot_2
















  )
);
// Get single booking
router.get(
  "/:id",
  asyncHandler(get_id_3




  )
);

// Update booking
router.put(
  "/:id",
  asyncHandler(put_id_4






  )
);

// Delete booking
router.delete(
  "/:id",
  asyncHandler(delete_id_5






  )
);

module.exports = router;
