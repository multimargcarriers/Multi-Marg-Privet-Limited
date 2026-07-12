const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "vendorOutstanding";


// Get all vendor outstanding entries
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("vendorOutstanding")
          .orderBy("date", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(
      res,
      "Vendor outstanding entries fetched successfully",
      data,
    );
  }),
);

// Get outstanding by vendor
router.get(
  "/vendor/:vendor",
  asyncHandler(async (req, res) => {
    const { vendor } = req.params;
    const snapshot = await db
      .collection("vendorOutstanding")
      .where("vendor", "==", vendor)
      .orderBy("date", "desc")
      .get();
    const entries = [];
    snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
    return success(
      res,
      "Vendor outstanding entries fetched successfully",
      entries,
    );
  }),
);

// Create vendor outstanding entry
router.post(
  "/",
  [
    body("vendor").notEmpty().withMessage("Vendor name is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("remarks").notEmpty().withMessage("Remarks is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const entry = req.body;
    entry.date = entry.date || new Date().toISOString();
    entry.createdAt = new Date().toISOString();

    const docRef = await db.collection("vendorOutstanding").add(entry);
    await delCache(CACHE_KEY);
    return created(res, "Vendor outstanding entry created successfully", {
      id: docRef.id,
      ...entry,
    });
  }),
);

// Delete vendor outstanding entry
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("vendorOutstanding").doc(id).get();
    if (!doc.exists)
      return error(res, "Vendor outstanding entry not found", 404);
    await db.collection("vendorOutstanding").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Vendor outstanding entry deleted successfully");
  }),
);

module.exports = router;
