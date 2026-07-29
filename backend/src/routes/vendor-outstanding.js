const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, get_vendor_vendor_2, postRoot_3, delete_id_4 } = require('../controllers/vendor-outstandingController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["accounts","vendor_outstanding"]));


const CACHE_KEY = "vendorOutstanding";


// Get all vendor outstanding entries
router.get(
  "/",
  asyncHandler(getRoot_1



















  )
);

// Get outstanding by vendor
router.get(
  "/vendor/:vendor",
  asyncHandler(get_vendor_vendor_2













  )
);

// Create vendor outstanding entry
router.post(
  "/",
  [
  body("vendor").notEmpty().withMessage("Vendor name is required"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("remarks").notEmpty().withMessage("Remarks is required")],

  asyncHandler(postRoot_3














  )
);

// Delete vendor outstanding entry
router.delete(
  "/:id",
  asyncHandler(delete_id_4







  )
);

module.exports = router;
