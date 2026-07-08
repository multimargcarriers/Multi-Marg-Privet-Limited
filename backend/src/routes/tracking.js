const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "tracking";

if (!mockData.tracking) {
  mockData.tracking = [
    {
      id: "tr1",
      awb: "LR-10001",
      date: new Date().toISOString(),
      location: "Delhi Terminal",
      status: "In Transit",
      remarks: "Shipment received at Delhi hub",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "tr2",
      awb: "LR-10002",
      date: new Date().toISOString(),
      location: "Mumbai Terminal",
      status: "Delivered",
      remarks: "Delivered to consignee",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "tr3",
      awb: "LR-10003",
      date: new Date().toISOString(),
      location: "Jaipur",
      status: "Picked Up",
      remarks: "Shipment picked up from consignor",
      updatedAt: new Date().toISOString(),
    },
  ];
}

// Get all tracking entries
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.tracking;
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
    if (useMockDB) {
      const entries = mockData.tracking.filter((t) => t.awb === awb);
      return success(res, "Tracking entries fetched successfully", entries);
    }
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

    if (useMockDB) {
      entry.id = uuidv4();
      mockData.tracking.push(entry);
      await delCache(CACHE_KEY);
      return created(res, "Tracking entry created successfully", entry);
    }
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
    if (useMockDB) {
      const idx = mockData.tracking.findIndex((t) => t.id === id);
      if (idx === -1) return error(res, "Tracking entry not found", 404);
      mockData.tracking.splice(idx, 1);
      await delCache(CACHE_KEY);
      return success(res, "Tracking entry deleted successfully");
    }
    const doc = await db.collection("tracking").doc(id).get();
    if (!doc.exists) return error(res, "Tracking entry not found", 404);
    await db.collection("tracking").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Tracking entry deleted successfully");
  }),
);

module.exports = router;
