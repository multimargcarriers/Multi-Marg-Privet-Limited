const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache, invalidatePattern } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/branchesController');

const CACHE_KEY = "branches";


// Get all branches
router.get(
  "/",
  asyncHandler(getRoot_1












  )
);

// Create branch
router.post(
  "/",
  [
  body("branch").notEmpty().withMessage("Branch name is required"),
  body("name").notEmpty().withMessage("Contact person is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("phno").notEmpty().withMessage("Phone number is required"),
  body("email").notEmpty().isEmail().withMessage("Valid email is required")],

  asyncHandler(postRoot_2









  )
);

// Update branch
router.put(
  "/:id",
  [param("id").notEmpty().withMessage("Branch ID is required")],
  asyncHandler(put_id_3










  )
);

// Delete branch
router.delete(
  "/:id",
  asyncHandler(delete_id_4






  )
);

module.exports = router;
