const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { filterByAccess } = require("../utils/security");

const CACHE_KEY = "tracking";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("tracking").orderBy("updatedAt", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Tracking entries fetched successfully", data);
};

exports.get_awb_2 = async (req, res) => {
  const { awb } = req.params;
  const snapshot = await db.collection("tracking").where("awb", "==", awb).orderBy("updatedAt", "desc").get();
  const entries = [];
  snapshot.forEach(doc => entries.push({
    id: doc.id,
    ...doc.data()
  }));
  return success(res, "Tracking entries fetched successfully", entries);
};

exports.postRoot_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const entry = req.body;
  
  // Save who entered the tracking update
  entry.enteredBy = req.user?.name || req.user?.email || "Unknown";
  entry.enteredById = req.user?.id || null;
  entry.enteredByRole = req.user?.role || "Unknown";

  entry.date = entry.date || new Date().toISOString();
  entry.updatedAt = new Date().toISOString();
  const docRef = await db.collection("tracking").add(entry);
  await delCache(CACHE_KEY);
  return created(res, "Tracking entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_4 = async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection("tracking").doc(id).get();
  if (!doc.exists) return error(res, "Tracking entry not found", 404);
  await db.collection("tracking").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, "Tracking entry deleted successfully");
};

exports.put_id_5 = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const doc = await db.collection("tracking").doc(id).get();
  if (!doc.exists) return error(res, "Tracking entry not found", 404);
  
  const updates = {
    ...req.body,
    updatedAt: new Date().toISOString(),
    enteredBy: req.user?.name || req.user?.email || "Unknown",
    enteredById: req.user?.id || null,
    enteredByRole: req.user?.role || "Unknown"
  };
  
  await db.collection("tracking").doc(id).update(updates);
  await delCache(CACHE_KEY);
  
  return success(res, "Tracking entry updated successfully", { id, ...updates });
};

exports.postBulk_6 = async (req, res) => {
  const { awbs, status, location, date, remarks } = req.body;
  if (!awbs || !Array.isArray(awbs) || awbs.length === 0) {
    return error(res, "awbs array is required", 400);
  }
  if (!status || !location) {
    return error(res, "status and location are required", 400);
  }

  const enteredBy = req.user?.name || req.user?.email || "Admin";
  const enteredById = req.user?.id || null;
  const enteredByRole = req.user?.role || "Admin";
  const now = new Date().toISOString();
  const trackingDate = date || now.split('T')[0];

  const createdEntries = [];

  const getSensibleRemark = (st, loc) => {
    const l = loc || "facility";
    if (st === "Delivered") return `Shipment successfully delivered at destination in ${l}`;
    if (st === "In Transit") return `Shipment in transit en route via ${l}`;
    if (st === "Reached Hub") return `Shipment arrived at transshipment facility in ${l}`;
    if (st === "Out for Delivery") return `Shipment out for delivery in ${l}`;
    if (st === "Picked Up") return `Shipment picked up and booked at ${l}`;
    if (st === "Delayed") return `Shipment in transit - experiencing operational delay at ${l}`;
    if (st === "Returned") return `Shipment returned to origin facility at ${l}`;
    return `Shipment status updated to ${st} at ${l}`;
  };

  for (const awb of awbs) {
    const cleanAwb = String(awb).trim().toUpperCase();
    const entryData = {
      awb: cleanAwb,
      status,
      location,
      date: trackingDate,
      remarks: remarks ? String(remarks).trim() : getSensibleRemark(status, location),
      enteredBy,
      enteredById,
      enteredByRole,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await db.collection("tracking").add(entryData);
    createdEntries.push({ id: docRef.id, ...entryData });
  }

  await delCache(CACHE_KEY);

  return created(res, `Tracking updated successfully for ${createdEntries.length} AWBs`, createdEntries);
};



