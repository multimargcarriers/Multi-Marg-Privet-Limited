const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { getRoot_1, postRoot_2, put_id_3, delete_id_4, deleteAll } = require('../controllers/vendorsController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["masters","vendors"]));


// Get all vendors
router.get(
  "/",
  asyncHandler(getRoot_1)
);

// Create new vendor
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("name is required"),
  ],
  asyncHandler(postRoot_2)
);

// Update vendor
router.put(
  "/:id",
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
  asyncHandler(delete_id_4)
);

module.exports = router;
