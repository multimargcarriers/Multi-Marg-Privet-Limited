const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/vendorsController');

const CACHE_KEY = "vendors";

// Get all vendors
router.get(
  "/",
  asyncHandler(getRoot_1













  )
);

// Create vendor
router.post(
  "/",
  [
  body("name").notEmpty().withMessage("Vendor name is required"),
  body("gst").notEmpty().withMessage("GST is required"),
  body("branch").notEmpty().withMessage("Branch is required"),
  body("mode").notEmpty().withMessage("Mode is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("contact").notEmpty().withMessage("Contact person is required"),
  body("phno").notEmpty().withMessage("Phone number is required"),
  body("email").notEmpty().isEmail().withMessage("Valid email is required")],

  asyncHandler(postRoot_2













  )
);
// Update vendor
router.put(
  "/:id",
  asyncHandler(put_id_3






  )
);

// Delete vendor
router.delete(
  "/:id",
  asyncHandler(delete_id_4






  )
);

module.exports = router;
