const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { generateLRNumber } = require("../utils/helpers");

const CACHE_KEY = "bookings";

// Create Booking (LR)
router.post(
  "/",
  [
    body("client").notEmpty().withMessage("Client name is required"),
    body("dispatch_date").notEmpty().withMessage("Date is required"),
    body("mode").notEmpty().withMessage("Mode is required"),
    body("consignor").notEmpty().withMessage("Consignor is required"),
    body("consignee").notEmpty().withMessage("Consignee is required"),
    body("origin").notEmpty().withMessage("Origin is required"),
    body("destination").notEmpty().withMessage("Destination is required"),
    body("box").notEmpty().withMessage("Box is required"),
    body("actual_wt").notEmpty().withMessage("Actual weight is required"),
    body("charge_wt").notEmpty().withMessage("Charge weight is required"),
    body("freight_charge").notEmpty().withMessage("Freight charge is required"),
    body("awb_charge").notEmpty().withMessage("Awb charge is required"),
    body("pickup_charge").notEmpty().withMessage("Pickup charge is required"),
    body("delivery_charge").notEmpty().withMessage("Delivery charge is required"),
    body("packaging_charge").notEmpty().withMessage("Packaging charge is required"),
    body("handling_charge").notEmpty().withMessage("Handling charge is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("insuredBy").notEmpty().withMessage("Insured By is required"),
    body("remarks").notEmpty().withMessage("Remarks are required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const booking = req.body;
    booking.date = new Date().toISOString();
    booking.status = "Booked";
    booking.lrNumber = generateLRNumber();


    const docRef = await db.collection("bookings").add(booking);
    await delCache(CACHE_KEY);
    return created(res, "Booking created successfully", {
      id: docRef.id,
      ...booking,
    });
  }),
);

// Get all bookings
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("bookings")
          .orderBy("date", "desc").limit(100).get();
        const bookings = [];
        snapshot.forEach((doc) => {
          bookings.push({ id: doc.id, ...doc.data() });
        });
        return bookings;
      },
      300,
    );
    return success(res, "Bookings fetched successfully", data);
  }),
);
// Get single booking
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("bookings").doc(id).get();
    if (!doc.exists) return error(res, "Booking not found", 404);
    return success(res, "Booking fetched successfully", { id: doc.id, ...doc.data() });
  }),
);

// Update booking
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("bookings").doc(id).get();
    if (!doc.exists) return error(res, "Booking not found", 404);
    await db.collection("bookings").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, "Booking updated successfully", { id, ...req.body });
  }),
);

// Delete booking
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("bookings").doc(id).get();
    if (!doc.exists) return error(res, "Booking not found", 404);
    await db.collection("bookings").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Booking deleted successfully");
  }),
);

module.exports = router;
