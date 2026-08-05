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
  
  // RLS Check: Ensure user is authorized to update this booking
  const awbToSearch = entry.awb;
  let hasAccess = false;
  const role = (req.user?.role || "").toLowerCase().replace(/\s+/g, '');
  if (role === 'superadmin' || role === 'admin' || req.user?.email === 'admin@multimargcarriers.co.in') {
    hasAccess = true;
  } else if (awbToSearch) {
    // Find booking matching this awb or id
    const bookingsSnap = await db.collection("bookings").get();
    let matchedBooking = null;
    bookingsSnap.forEach(doc => {
      const b = { id: doc.id, ...doc.data() };
      const shortId = b.id ? String(b.id).substring(0, 8).toUpperCase() : "";
      if (
        b.awb === awbToSearch || b.consignment === awbToSearch || b.awbNo === awbToSearch ||
        b.lrNumber === awbToSearch || b.lrNo === awbToSearch || b.lr_number === awbToSearch ||
        b.id === awbToSearch || shortId === awbToSearch
      ) {
        matchedBooking = b;
      }
    });
    
    if (matchedBooking) {
      const allowed = filterByAccess([matchedBooking], req.user, "bookings");
      if (allowed.length > 0) hasAccess = true;
    }
  }

  if (!hasAccess) {
    return error(res, "Forbidden: You are not authorized to update tracking for this shipment.", 403);
  }

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
  await db.collection("tracking").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, "Tracking entry deleted successfully");
};
