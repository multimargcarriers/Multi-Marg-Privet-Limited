const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { getRoot_1, postRoot_2, put_id_3, delete_id_4, deleteAll } = require('../controllers/vendorsController');

const { requirePermission } = require("../middleware/rbac");


// Get all vendors
router.get(
  "/",
  requirePermission(["masters","vendors","vendors_data","all"]),
  asyncHandler(getRoot_1)
);

// Create new vendor
router.post(
  "/",
  requirePermission(["masters","vendors","all"]),
  [
    body("name").notEmpty().withMessage("name is required"),
  ],
  asyncHandler(postRoot_2)
);

// Update vendor
router.put(
  "/:id",
  requirePermission(["masters","vendors","all"]),
  asyncHandler(put_id_3)
);

// Delete all vendors
router.delete(
  "/all",
  asyncHandler(deleteAll)
);

// Delete vendor
router.delete(
  "/:id",
  requirePermission(["masters","vendors","all"]),
  asyncHandler(delete_id_4)
);

module.exports = router;
