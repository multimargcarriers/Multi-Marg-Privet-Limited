const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { generateLRNumber } = require("../utils/helpers");
const { postRoot_1, getRoot_2, get_id_3, put_id_4, delete_id_5, delete_clear_all_6 } = require('../controllers/bookingsController');
const { requirePermission } = require("../middleware/rbac");

const CACHE_KEY = "bookings";

// Define read and write permissions separately
const readPerms = ['operations', 'bookings', 'create_booking', 'pod', 'upload_box', 'generate_bills', 'unbilled_reports', 'track_shipment'];
const createPerms = ['operations', 'bookings', 'create_booking'];
const writePerms = ['operations', 'bookings'];

// Create Booking (LR)
router.post(
  "/",
  requirePermission(createPerms),
  [
    body("client").notEmpty().withMessage("Client name is required"),
    body("dispatch_date").notEmpty().withMessage("Date is required"),
    body("mode").notEmpty().withMessage("Mode is required"),
    body("consignor").notEmpty().withMessage("Consignor is required"),
    body("consignee").notEmpty().withMessage("Consignee is required"),
    body("origin").notEmpty().withMessage("Origin is required"),
    body("destination").notEmpty().withMessage("Destination is required"),
    body("box").notEmpty().withMessage("Box is required"),
    body("actual_wt").optional({ nullable: true, checkFalsy: true }),
    body("charge_wt").optional({ nullable: true, checkFalsy: true }),
    body("freight_charge").optional({ nullable: true, checkFalsy: true }),
    body("awb_charge").optional({ nullable: true, checkFalsy: true }),
    body("pickup_charge").optional({ nullable: true, checkFalsy: true }),
    body("delivery_charge").optional({ nullable: true, checkFalsy: true }),
    body("packaging_charge").optional({ nullable: true, checkFalsy: true }),
    body("handling_charge").optional({ nullable: true, checkFalsy: true }),
    body("description").notEmpty().withMessage("Description is required"),
    body("insuredBy").notEmpty().withMessage("Insured By is required"),
    body("remarks").optional({ nullable: true, checkFalsy: true })
  ],

  asyncHandler(postRoot_1
















  )
);

// Get all bookings
router.get(
  "/",
  requirePermission(readPerms),
  asyncHandler(getRoot_2
















  )
);
// Clear all bookings
router.delete(
  "/clear/all",
  requirePermission(writePerms),
  asyncHandler(delete_clear_all_6)
);

// Get single booking
router.get(
  "/:id",
  requirePermission(readPerms),
  asyncHandler(get_id_3




  )
);

// Update booking
router.put(
  "/:id",
  requirePermission(writePerms),
  asyncHandler(put_id_4






  )
);

// Delete booking
router.delete(
  "/:id",
  requirePermission(writePerms),
  asyncHandler(delete_id_5






  )
);

module.exports = router;
