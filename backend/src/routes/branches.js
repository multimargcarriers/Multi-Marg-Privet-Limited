const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache, invalidatePattern } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");
const branchesController = require('../controllers/branchesController');

const { requirePermission } = require("../middleware/rbac");

const CACHE_KEY = "branches";

// Get all branches
router.get(
  "/",
  requirePermission(["masters","branches","branches_data","all"]), asyncHandler(branchesController.getRoot_1));

// Create branch
router.post(
  "/",
  requirePermission(["masters","branches","all"]),
  [
    body("branch").notEmpty().withMessage("Branch name is required"),
    body("name").notEmpty().withMessage("Contact person is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("phno").notEmpty().withMessage("Phone number is required"),
    body("email").notEmpty().isEmail().withMessage("Valid email is required")
  ],
  asyncHandler(branchesController.postRoot_2)
);

// Update branch
router.put(
  "/:id",
  requirePermission(["masters","branches","all"]),
  [param("id").notEmpty().withMessage("Branch ID is required")],
  asyncHandler(branchesController.put_id_3)
);

// Delete all branches (SuperAdmin only logically, handled in frontend or middleware)
router.delete("/all", asyncHandler(branchesController.deleteAll));

// Delete branch
router.delete(
  "/:id",
  requirePermission(["masters","branches","all"]),
  asyncHandler(branchesController.delete_id_4)
);

module.exports = router;
