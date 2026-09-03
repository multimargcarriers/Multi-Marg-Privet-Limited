const { emitDataUpdated } = require("../utils/socket");
const {
  db
} = require("../config/database");
const {
  v4: uuidv4
} = require("uuid");
const {
  success,
  created,
  error
} = require("../utils/response");
const {
  asyncHandler
} = require("../middleware/errorHandler");
const {
  getOrSet,
  delCache
} = require("../config/redis");
const {
  body,
  validationResult
} = require("express-validator");
const { getNextSequence } = require("../utils/sequenceGenerator");

const CACHE_KEY = "trips";


exports.getRoot_1 = async (req, res) => {
  const user = req.user;
  const allTrips = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("trips").orderBy("date", "desc").get();
    const trips = [];
    snapshot.forEach(doc => trips.push({
      id: doc.id,
      ...doc.data()
    }));
    return trips;
  }, 300);

  // Admin / SuperAdmin see everything
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isAdmin = role === 'superadmin' || role === 'admin' || user?.email === 'admin@multimarg.com';

  let data = allTrips;
  if (!isAdmin && user) {
    const isVendor = role === 'vendor';
    if (isVendor) {
      // Vendors see trips where they are the mapped vendor
      const userName = (user.name || '').toLowerCase().trim();
      const userVendor = (user.vendorName || user.vendor || '').toLowerCase().trim();
      data = allTrips.filter(t => {
        const v = (t.vendor || '').toLowerCase().trim();
        return (
          t.createdBy === user.id ||
          t.userId === user.id ||
          (userVendor && (v === userVendor || v.includes(userVendor) || userVendor.includes(v))) ||
          (userName && (v === userName || v.includes(userName) || userName.includes(v)))
        );
      });
    } else {
      // Employees (and any other non-admin role) see only their own entries
      data = allTrips.filter(t => t.createdBy === user.id || t.userId === user.id);
    }
  }

  return success(res, "Trips fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const trip = req.body;
  trip.date = trip.date || new Date().toISOString();
  trip.status = "Active";
  trip.createdBy = req.user?.id || null;
  trip.creatorRole = req.user?.role || 'Unknown';
  trip.creatorName = req.user?.name || req.user?.email || 'Unknown';
  trip.approvalStatus = req.user?.role === 'Vendor' ? 'Pending' : 'Approved';
  
  if (!trip.tripNo || trip.tripNo.trim() === '') {
    const prefix = trip.mode ? String(trip.mode).toUpperCase() : 'TRP';
    const seq = await getNextSequence(prefix);
    trip.tripNo = seq.split('-')[1] || seq;
  } else {
    const cleanNo = trip.tripNo.trim();
    const existing = await db.collection("trips").where("tripNo", "==", cleanNo).get();
    if (!existing.empty) {
      return error(res, `A trip with number "${cleanNo}" already exists.`, 400);
    }
    trip.tripNo = cleanNo;
  }
  
  const docRef = await db.collection("trips").add(trip);
  await delCache(CACHE_KEY);
  emitDataUpdated("trips", "create");
  return created(res, "Trip created successfully", {
    id: docRef.id,
    ...trip
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("trips").doc(id).get();
  if (!doc.exists) return error(res, "Trip not found", 404);

  if (req.body.tripNo && req.body.tripNo.trim() !== (doc.data().tripNo || '').trim()) {
    const cleanNo = req.body.tripNo.trim();
    const existing = await db.collection("trips").where("tripNo", "==", cleanNo).get();
    let collision = false;
    existing.forEach(d => {
      if (d.id !== id) collision = true;
    });
    if (collision) {
      return error(res, `A trip with number "${cleanNo}" already exists.`, 400);
    }
    req.body.tripNo = cleanNo;
  }

  await db.collection("trips").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  emitDataUpdated("trips", "update");
  return success(res, "Trip updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("trips").doc(id).get();
  if (!doc.exists) return error(res, "Trip not found", 404);
  await db.collection("trips").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  emitDataUpdated("trips", "delete");
    return success(res, "Trip deleted successfully");
};

