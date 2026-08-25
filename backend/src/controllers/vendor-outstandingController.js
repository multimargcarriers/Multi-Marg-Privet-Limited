const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { recalculatePartyPayments } = require("../utils/paymentUtils");

const CACHE_KEY = "vendorOutstanding";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("vendorOutstanding").orderBy("date", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Vendor outstanding entries fetched successfully", data);
};

exports.get_vendor_vendor_2 = async (req, res) => {
  const { vendor } = req.params;
  const snapshot = await db.collection("vendorOutstanding").where("vendor", "==", vendor).orderBy("date", "desc").get();
  const entries = [];
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));
  return success(res, "Vendor outstanding entries fetched successfully", entries);
};

exports.postRoot_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const entry = req.body;
  entry.date = entry.date || new Date().toISOString();
  entry.createdAt = new Date().toISOString();
  const docRef = await db.collection("vendorOutstanding").add(entry);

  // Sync to Cash Sheet (cashEntries) as Cash Out
  try {
    if (db.mongoDb) {
      await db.mongoDb.collection("cashEntries").insertOne({
        id: docRef.id,
        amount: Number(entry.amount || 0),
        date: String(entry.date).split("T")[0],
        type: "out",
        partyType: "vendor",
        partyName: String(entry.vendor || "").toLowerCase().trim(),
        remarks: String(entry.remarks || "Vendor Payment").trim(),
        paymentMode: String(entry.remarks || "Bank").trim(),
        createdAt: new Date().toISOString()
      });
    }
  } catch (cErr) {}

  // Automatically recalculate purchase bill settlements and vendor outstanding
  if (entry.vendor) {
    try {
      await recalculatePartyPayments("Vendor", entry.vendor);
    } catch (rErr) {
      console.error("[Vendor Outstanding] Auto-recalculate error:", rErr.message);
    }
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("purchases"),
    delCache("cashEntries"),
    delCache("outstanding")
  ]);

  return created(res, "Vendor outstanding entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("vendorOutstanding").doc(id).get();
  if (!doc.exists) return error(res, "Vendor outstanding entry not found", 404);
  const data = doc.data() || {};
  await db.collection("vendorOutstanding").doc(id).delete(req.user);

  // Also remove from cashEntries if linked
  try {
    if (db.mongoDb) {
      await db.mongoDb.collection("cashEntries").deleteMany({
        $or: [{ id: id }, { date: data.date, partyName: String(data.vendor || '').toLowerCase().trim(), amount: Number(data.amount) }]
      });
    }
  } catch (cErr) {}

  // Automatically recalculate purchase bill settlements and vendor outstanding
  if (data.vendor) {
    try {
      await recalculatePartyPayments("Vendor", data.vendor);
    } catch (rErr) {
      console.error("[Vendor Outstanding] Auto-recalculate error:", rErr.message);
    }
  }

  await Promise.all([
    delCache(CACHE_KEY),
    delCache("purchases"),
    delCache("cashEntries"),
    delCache("outstanding")
  ]);

  return success(res, "Vendor outstanding entry deleted successfully");
};
