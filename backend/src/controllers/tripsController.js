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
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("trips").orderBy("date", "desc").get();
    const trips = [];
    snapshot.forEach(doc => trips.push({
      id: doc.id,
      ...doc.data()
    }));
    return trips;
  }, 300);
  return success(res, "Trips fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const trip = req.body;
  trip.date = trip.date || new Date().toISOString();
  trip.status = "Active";
  trip.approvalStatus = req.user?.role === 'Vendor' ? 'Pending' : 'Approved';
  
  if (!trip.tripNo || trip.tripNo.trim() === '') {
    trip.tripNo = await getNextSequence('TRP');
  }
  
  const docRef = await db.collection("trips").add(trip);
  await delCache(CACHE_KEY);
  emitDataUpdated("trips");
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
  await db.collection("trips").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  emitDataUpdated("trips");
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
  emitDataUpdated("trips");
    return success(res, "Trip deleted successfully");
};

