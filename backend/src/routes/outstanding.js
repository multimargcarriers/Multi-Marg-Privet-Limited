const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "outstanding";


// Get all outstanding entries
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("outstanding")
          .orderBy("date", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(res, "Outstanding entries fetched successfully", data);
  }),
);

// Get outstanding by client
router.get(
  "/client/:client",
  asyncHandler(async (req, res) => {
    const { client } = req.params;
    const snapshot = await db
      .collection("outstanding")
      .where("client", "==", client)
      .orderBy("date", "desc")
      .get();
    const entries = [];
    snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
    return success(res, "Outstanding entries fetched successfully", entries);
  }),
);

// Create outstanding entry
router.post(
  "/",
  [
    body("client").notEmpty().withMessage("Client name is required"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("particulars").notEmpty().withMessage("Particulars is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const entry = req.body;
    entry.date = entry.date || new Date().toISOString();
    entry.createdAt = new Date().toISOString();

    const docRef = await db.collection("outstanding").add(entry);
    await delCache(CACHE_KEY);
    return created(res, "Outstanding entry created successfully", {
      id: docRef.id,
      ...entry,
    });
  }),
);

// Delete outstanding entry
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("outstanding").doc(id).get();
    if (!doc.exists) return error(res, "Outstanding entry not found", 404);
    await db.collection("outstanding").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Outstanding entry deleted successfully");
  }),
);

module.exports = router;
