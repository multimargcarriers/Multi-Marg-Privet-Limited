const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "cashEntries";

if (!mockData.cashEntries) {
  mockData.cashEntries = [
    {
      id: "ce1",
      amount: 50000,
      type: "in",
      date: new Date().toISOString(),
      remarks: "Client payment received",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ce2",
      amount: 15000,
      type: "out",
      date: new Date().toISOString(),
      remarks: "Fuel expense",
      createdAt: new Date().toISOString(),
    },
  ];
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.cashEntries;
        const snapshot = await db
          .collection("cashEntries")
          .orderBy("date", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(res, "Cash entries fetched successfully", data);
  }),
);

router.post(
  "/",
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("type").isIn(["in", "out"]).withMessage("Type must be in or out"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const entry = req.body;
    entry.date = entry.date || new Date().toISOString();
    entry.createdAt = new Date().toISOString();
    if (useMockDB) {
      entry.id = uuidv4();
      mockData.cashEntries.push(entry);
      await delCache(CACHE_KEY);
      return created(res, "Cash entry created successfully", entry);
    }
    const docRef = await db.collection("cashEntries").add(entry);
    await delCache(CACHE_KEY);
    return created(res, "Cash entry created successfully", {
      id: docRef.id,
      ...entry,
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (useMockDB) {
      const idx = mockData.cashEntries.findIndex((e) => e.id === id);
      if (idx === -1) return error(res, "Cash entry not found", 404);
      mockData.cashEntries = mockData.cashEntries.filter((e) => e.id !== id);
      await delCache(CACHE_KEY);
      return success(res, "Cash entry deleted successfully");
    }
    const doc = await db.collection("cashEntries").doc(id).get();
    if (!doc.exists) return error(res, "Cash entry not found", 404);
    await db.collection("cashEntries").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Cash entry deleted successfully");
  }),
);

module.exports = router;
