const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "vendors";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("vendors").get();
    const vendors = [];
    snapshot.forEach(doc => {
      vendors.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return vendors;
  }, 300);
  return success(res, {
    message: "Vendors fetched successfully",
    data
  });
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, {
      message: "Validation failed",
      statusCode: 400,
      details: errors.array()
    });
  }
  const newVendor = req.body;
  newVendor.status = "Active";
  newVendor.createdAt = new Date().toISOString();
  const docRef = await db.collection("vendors").add(newVendor);
  await delCache(CACHE_KEY);
  return created(res, {
    message: "Vendor created successfully",
    data: {
      id: docRef.id,
      ...newVendor
    }
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("vendors").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Vendor not found",
    statusCode: 404
  });
  await db.collection("vendors").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Vendor updated successfully",
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
  const doc = await db.collection("vendors").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Vendor not found",
    statusCode: 404
  });
  await db.collection("vendors").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Vendor deleted successfully"
  });
};

exports.deleteAll = async (req, res) => {
  try {
    const vendors = await db.mongoDb.collection("vendors").find({}).toArray();
    if (vendors.length > 0) {
      const trashDocs = vendors.map(doc => ({
        originalCollection: "vendors",
        document: doc,
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
      }));
      await db.mongoDb.collection("trash").insertMany(trashDocs);
    }
    await db.mongoDb.collection("vendors").deleteMany({});
    await delCache(CACHE_KEY);
    return success(res, {
      message: "All vendors deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting all vendors:", err);
    return error(res, {
      message: "Failed to delete all vendors",
      statusCode: 500
    });
  }
};
