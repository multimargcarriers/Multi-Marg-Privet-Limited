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

const CACHE_KEY = "purchases";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("purchases").orderBy("date", "desc").get();
    const purchases = [];
    snapshot.forEach(doc => purchases.push({
      id: doc.id,
      ...doc.data()
    }));
    return purchases;
  }, 300);
  return success(res, "Purchases fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const purchase = req.body;
  purchase.date = purchase.date || new Date().toISOString();
  purchase.createdAt = new Date().toISOString();
  const docRef = await db.collection("purchases").add(purchase);
  await delCache(CACHE_KEY);
  return created(res, "Purchase created successfully", {
    id: docRef.id,
    ...purchase
  });
};

exports.delete_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("purchases").doc(id).get();
  if (!doc.exists) return error(res, "Purchase not found", 404);
  await db.collection("purchases").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, "Purchase deleted successfully");
};

