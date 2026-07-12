const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "rates";


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db.collection("rates").get();
        const rates = [];
        snapshot.forEach((doc) => rates.push({ id: doc.id, ...doc.data() }));
        return rates;
      },
      300,
    );
    return success(res, "Rates fetched successfully", data);
  }),
);

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
    body("roadExpressDelivery").notEmpty().withMessage("Road Express Delivery is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const newRate = req.body;
    newRate.createdAt = new Date().toISOString();
    const docRef = await db.collection("rates").add(newRate);
    await delCache(CACHE_KEY);
    return created(res, "Rate created successfully", {
      id: docRef.id,
      ...newRate,
    });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("rates").doc(id).get();
    if (!doc.exists) return error(res, "Rate not found", 404);
    await db.collection("rates").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, "Rate updated successfully", { id, ...req.body });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("rates").doc(id).get();
    if (!doc.exists) return error(res, "Rate not found", 404);
    await db.collection("rates").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Rate deleted successfully");
  }),
);

module.exports = router;
