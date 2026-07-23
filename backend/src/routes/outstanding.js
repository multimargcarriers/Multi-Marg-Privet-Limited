const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, get_client_client_2, postRoot_3, delete_id_4 } = require('../controllers/outstandingController');

const CACHE_KEY = "outstanding";


// Get all outstanding entries
router.get(
  "/",
  asyncHandler(getRoot_1















  )
);

// Get outstanding by client
router.get(
  "/client/:client",
  asyncHandler(get_client_client_2









  )
);

// Create outstanding entry
router.post(
  "/",
  [
  body("client").notEmpty().withMessage("Client name is required"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("particulars").notEmpty().withMessage("Particulars is required")],

  asyncHandler(postRoot_3














  )
);

// Delete outstanding entry
router.delete(
  "/:id",
  asyncHandler(delete_id_4






  )
);

module.exports = router;
