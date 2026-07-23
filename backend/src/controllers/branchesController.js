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
  delCache,
  invalidatePattern
} = require("../config/redis");
const {
  body,
  param,
  validationResult
} = require("express-validator");

const CACHE_KEY = "branches";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("branches").limit(100).get();
    const branches = [];
    snapshot.forEach(doc => branches.push({
      id: doc.id,
      ...doc.data()
    }));
    return branches;
  }, 300);
  return success(res, {
    message: "Branches fetched successfully",
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
  const newBranch = req.body;
  newBranch.createdAt = new Date().toISOString();
  const docRef = await db.collection("branches").add(newBranch);
  await delCache(CACHE_KEY);
  return created(res, {
    message: "Branch created successfully",
    data: {
      id: docRef.id,
      ...newBranch
    }
  });
};

exports.put_id_3 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, {
    message: "Validation failed",
    statusCode: 400,
    details: errors.array()
  });
  const {
    id
  } = req.params;
  const doc = await db.collection("branches").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Branch not found",
    statusCode: 404
  });
  await db.collection("branches").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Branch updated successfully",
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
  const doc = await db.collection("branches").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Branch not found",
    statusCode: 404
  });
  await db.collection("branches").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Branch deleted successfully"
  });
};

