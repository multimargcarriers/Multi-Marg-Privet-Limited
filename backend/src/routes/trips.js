const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "trips";


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("trips")
          .orderBy("date", "desc").limit(100).get();
        const trips = [];
        snapshot.forEach((doc) => trips.push({ id: doc.id, ...doc.data() }));
        return trips;
      },
      300,
    );
    return success(res, "Trips fetched successfully", data);
  }),
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
    body("specialInstruction").notEmpty().withMessage("Special instruction is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const trip = req.body;
    trip.date = trip.date || new Date().toISOString();
    trip.status = "Active";
    const docRef = await db.collection("trips").add(trip);
    await delCache(CACHE_KEY);
    return created(res, "Trip created successfully", {
      id: docRef.id,
      ...trip,
    });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("trips").doc(id).get();
    if (!doc.exists) return error(res, "Trip not found", 404);
    await db.collection("trips").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, "Trip updated successfully", { id, ...req.body });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("trips").doc(id).get();
    if (!doc.exists) return error(res, "Trip not found", 404);
    await db.collection("trips").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Trip deleted successfully");
  }),
);

module.exports = router;
