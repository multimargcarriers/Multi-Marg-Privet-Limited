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

const CACHE_KEY = "rates";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("rates").get();
    const rates = [];
    snapshot.forEach(doc => rates.push({
      id: doc.id,
      ...doc.data()
    }));
    return rates;
  }, 300);
  return success(res, "Rates fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const newRate = req.body;
  newRate.createdAt = new Date().toISOString();
  const docRef = await db.collection("rates").add(newRate);
  await delCache(CACHE_KEY);
  return created(res, "Rate created successfully", {
    id: docRef.id,
    ...newRate
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("rates").doc(id).get();
  if (!doc.exists) return error(res, "Rate not found", 404);
  await db.collection("rates").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, "Rate updated successfully", {
    id,
    ...req.body
  });
};

exports.delete_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("rates").doc(id).get();
  if (!doc.exists) return error(res, "Rate not found", 404);
  await db.collection("rates").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, "Rate deleted successfully");
};

exports.deleteAll = async (req, res) => {
  try {
    await db.mongoDb.collection("rates").deleteMany({});
    await delCache(CACHE_KEY);
    return success(res, {
      message: "All rates deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting all rates:", err);
    return error(res, {
      message: "Failed to delete all rates",
      statusCode: 500
    });
  }
};
