const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "clients";


exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("clients").get();
    const clients = [];
    snapshot.forEach(doc => {
      clients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return clients;
  }, 300);
  return success(res, {
    message: "Clients fetched successfully",
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
  const newClient = req.body;
  newClient.status = "Active";
  newClient.createdAt = new Date().toISOString();
  const docRef = await db.collection("clients").add(newClient);
  await delCache(CACHE_KEY);
  return created(res, {
    message: "Client created successfully",
    data: {
      id: docRef.id,
      ...newClient
    }
  });
};

exports.put_id_3 = async (req, res) => {
  const {
    id
  } = req.params;
  const doc = await db.collection("clients").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Client not found",
    statusCode: 404
  });
  await db.collection("clients").doc(id).update(req.body);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Client updated successfully",
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
  const doc = await db.collection("clients").doc(id).get();
  if (!doc.exists) return error(res, {
    message: "Client not found",
    statusCode: 404
  });
  await db.collection("clients").doc(id).delete();
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Client deleted successfully"
  });
};

exports.deleteAll = async (req, res) => {
  try {
    await db.mongoDb.collection("clients").deleteMany({});
    await delCache(CACHE_KEY);
    return success(res, {
      message: "All clients deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting all clients:", err);
    return error(res, {
      message: "Failed to delete all clients",
      statusCode: 500
    });
  }
};
