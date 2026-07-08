const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "outstanding";

if (!mockData.outstanding) {
  mockData.outstanding = [
    {
      id: "os1",
      date: new Date().toISOString(),
      amount: 50000,
      client: "Tata Motors",
      particulars: "Payment received",
      bankname: "HDFC Bank",
      createdAt: new Date().toISOString(),
    },
    {
      id: "os2",
      date: new Date().toISOString(),
      amount: 25000,
      client: "Reliance Retail",
      particulars: "Advance payment",
      bankname: "ICICI Bank",
      createdAt: new Date().toISOString(),
    },
    {
      id: "os3",
      date: new Date().toISOString(),
      amount: 75000,
      client: "Tata Motors",
      particulars: "Outstanding bill payment",
      bankname: "SBI",
      createdAt: new Date().toISOString(),
    },
  ];
}

// Get all outstanding entries
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.outstanding;
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
    if (useMockDB) {
      const entries = mockData.outstanding.filter(
        (o) => o.client.toLowerCase() === client.toLowerCase(),
      );
      return success(res, "Outstanding entries fetched successfully", entries);
    }
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

    if (useMockDB) {
      entry.id = uuidv4();
      mockData.outstanding.push(entry);
      await delCache(CACHE_KEY);
      return created(res, "Outstanding entry created successfully", entry);
    }
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
    if (useMockDB) {
      const idx = mockData.outstanding.findIndex((o) => o.id === id);
      if (idx === -1) return error(res, "Outstanding entry not found", 404);
      mockData.outstanding.splice(idx, 1);
      await delCache(CACHE_KEY);
      return success(res, "Outstanding entry deleted successfully");
    }
    const doc = await db.collection("outstanding").doc(id).get();
    if (!doc.exists) return error(res, "Outstanding entry not found", 404);
    await db.collection("outstanding").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Outstanding entry deleted successfully");
  }),
);

module.exports = router;
