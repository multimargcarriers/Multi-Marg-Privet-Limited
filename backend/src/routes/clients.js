const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/clientsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["masters","clients"]));


const CACHE_KEY = "clients";

// Get all clients
router.get(
  "/",
  asyncHandler(getRoot_1













  )
);

// Create client
router.post(
  "/",
  [
  body("name").notEmpty().withMessage("Client name is required"),
  body("gst").notEmpty().withMessage("GST is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("contact").notEmpty().withMessage("Contact person is required"),
  body("email").notEmpty().isEmail().withMessage("Valid email is required")],

  asyncHandler(postRoot_2













  )
);
// Update client
router.put(
  "/:id",
  asyncHandler(put_id_3






  )
);

// Delete client
router.delete(
  "/:id",
  asyncHandler(delete_id_4






  )
);

module.exports = router;
