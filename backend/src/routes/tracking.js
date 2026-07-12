const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "tracking";


// Get all tracking entries
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("tracking")
          .orderBy("updatedAt", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(res, "Tracking entries fetched successfully", data);
  }),
);

// Get tracking by AWB
router.get(
  "/:awb",
  asyncHandler(async (req, res) => {
    const { awb } = req.params;
    const snapshot = await db
      .collection("tracking")
      .where("awb", "==", awb)
      .orderBy("updatedAt", "desc")
      .get();
    const entries = [];
    snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
    return success(res, "Tracking entries fetched successfully", entries);
  }),
);

// Create tracking entry
router.post(
  "/",
  [
    body("awb").notEmpty().withMessage("AWB number is required"),
    body("status").notEmpty().withMessage("Status is required"),
    body("location").notEmpty().withMessage("Location is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const entry = req.body;
    entry.date = entry.date || new Date().toISOString();
    entry.updatedAt = new Date().toISOString();

    const docRef = await db.collection("tracking").add(entry);
    await delCache(CACHE_KEY);
    return created(res, "Tracking entry created successfully", {
      id: docRef.id,
      ...entry,
    });
  }),
);

// Delete tracking entry
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("tracking").doc(id).get();
    if (!doc.exists) return error(res, "Tracking entry not found", 404);
    await db.collection("tracking").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Tracking entry deleted successfully");
  }),
);

module.exports = router;
