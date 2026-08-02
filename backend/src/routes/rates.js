const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { getRoot_1, postRoot_2, put_id_3, delete_id_4, deleteAll } = require('../controllers/ratesController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["rates","client_rates"]));

const CACHE_KEY = "rates";

router.get("/", asyncHandler(getRoot_1));

router.post(
  "/",
  [
    body("client").notEmpty().withMessage("Client name is required"),
    body("origin").notEmpty().withMessage("Origin is required"),
    body("destination").notEmpty().withMessage("Destination is required"),
    body("awbCharge").notEmpty().withMessage("AWB Charge is required"),
    body("airRate").notEmpty().withMessage("Air Rate is required"),
    body("airPickup").notEmpty().withMessage("Air Pickup is required"),
    body("airDelivery").notEmpty().withMessage("Air Delivery is required"),
    body("trainRate").notEmpty().withMessage("Train Rate is required"),
    body("trainPickup").notEmpty().withMessage("Train Pickup is required"),
    body("trainDelivery").notEmpty().withMessage("Train Delivery is required"),
    body("roadRate").notEmpty().withMessage("Road Rate is required"),
    body("roadPickup").notEmpty().withMessage("Road Pickup is required"),
    body("roadDelivery").notEmpty().withMessage("Road Delivery is required"),
    body("roadExpressRate").notEmpty().withMessage("Road Express Rate is required"),
    body("roadExpressPickup").notEmpty().withMessage("Road Express Pickup is required"),
    body("roadExpressDelivery").notEmpty().withMessage("Road Express Delivery is required")
  ],
  asyncHandler(postRoot_2)
);

router.delete("/all", asyncHandler(deleteAll));

router.put("/:id", asyncHandler(put_id_3));

router.delete("/:id", asyncHandler(delete_id_4));

module.exports = router;
