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
  param,
  validationResult
} = require("express-validator");

const CACHE_KEY = "cities";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("cities").get();
    const cities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      cities.push({
        id: doc.id,
        ...data
      });
    });
    return cities;
  }, 86400 // Cache for 24 hours
  );
  return success(res, {
    message: "Cities fetched successfully",
    data
  });
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, {
    message: "Validation failed",
    statusCode: 400,
    details: errors.array()
  });
  const newCity = req.body;
  newCity.createdAt = new Date().toISOString();
  const docRef = await db.collection("cities").add(newCity);
  await delCache(CACHE_KEY);
  return created(res, {
    message: "City created successfully",
    data: {
      id: docRef.id,
      ...newCity
    }
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("cities").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "City not found",
    statusCode: 404
  });
  await db.collection("cities").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "City updated successfully",
    data: {
      id,
      ...req.body
    }
  });
};

exports.delete_id_4 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("cities").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "City not found",
    statusCode: 404
  });
  await db.collection("cities").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, {
    message: "City deleted successfully"
  });
};

