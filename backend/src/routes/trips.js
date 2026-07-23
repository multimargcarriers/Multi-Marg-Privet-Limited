const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/tripsController');

const CACHE_KEY = "trips";


router.get(
  "/",
  asyncHandler(getRoot_1














  )
);

router.post(
  "/",
  [
  body("date").notEmpty().withMessage("Date is required"),
  body("vehicleType").notEmpty().withMessage("Vehicle type is required"),
  body("vehicleRate").notEmpty().withMessage("Vehicle rate is required"),
  body("vehicleNo").notEmpty().withMessage("Vehicle number is required"),
  body("driverName").notEmpty().withMessage("Driver name is required"),
  body("vendor").notEmpty().withMessage("Vendor is required"),
  body("origin").notEmpty().withMessage("Origin is required"),
  body("destination").notEmpty().withMessage("Destination is required"),
  body("materialDetails").isArray({ min: 1 }).withMessage("At least one material detail is required"),
  body("specialInstruction").notEmpty().withMessage("Special instruction is required")],

  asyncHandler(postRoot_2













  )
);

router.put(
  "/:id",
  asyncHandler(put_id_3






  )
);

router.delete(
  "/:id",
  asyncHandler(delete_id_4






  )
);

module.exports = router;
