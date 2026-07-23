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
const {
  generateLRNumber
} = require("../utils/helpers");

exports.postRoot_1 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const booking = req.body;
  booking.date = new Date().toISOString();
  booking.status = "Booked";
  booking.lrNumber = generateLRNumber();
  const docRef = await db.collection("bookings").add(booking);
  await delCache(CACHE_KEY);
  return created(res, "Booking created successfully", {
    id: docRef.id,
    ...booking
  });
};

exports.getRoot_2 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("bookings").orderBy("date", "desc").limit(100).get();
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return bookings;
  }, 300);
  return success(res, "Bookings fetched successfully", data);
};

exports.get_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  return success(res, "Booking fetched successfully", {
    id: doc.id,
    ...doc.data()
  });
};

exports.put_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  await db.collection("bookings").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, "Booking updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_5 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("bookings").doc(id).get();
  if (!doc.exists) return error(res, "Booking not found", 404);
  await db.collection("bookings").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, "Booking deleted successfully");
};

