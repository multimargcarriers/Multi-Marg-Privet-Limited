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
  const providedId = newClient.id;
  delete newClient.id; // Don't save it inside the object directly if standardizing

  newClient.status = "Active";
  newClient.createdAt = new Date().toISOString();

  let docRefId;
  if (providedId && providedId.startsWith("offline_")) {
    await db.collection("clients").doc(providedId).set(newClient);
    docRefId = providedId;
  } else {
    const docRef = await db.collection("clients").add(newClient);
    docRefId = docRef.id;
  }

  await delCache(CACHE_KEY);
  return created(res, {
    message: "Client created successfully",
    data: {
      id: docRefId,
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
  await db.collection("clients").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Client deleted successfully"
  });
};

exports.deleteAll = async (req, res) => {
  try {
    const clients = await db.mongoDb.collection("clients").find({}).toArray();
    if (clients.length > 0) {
      const trashDocs = clients.map(doc => ({
        originalCollection: "clients",
        document: doc,
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
      }));
      await db.mongoDb.collection("trash").insertMany(trashDocs);
    }
    
    await db.mongoDb.collection("clients").deleteMany({});
    
    // Attempt cache delete but don't fail if it doesn't exist
    try {
      if (typeof delCache !== 'undefined' && typeof CACHE_KEY !== 'undefined') {
        await delCache(CACHE_KEY);
      }
    } catch(e) {}

    if (typeof success !== 'undefined') {
      return success(res, { message: "All clients moved to Trash" });
    } else {
      return res.status(200).json({ success: true, message: "All clients moved to Trash" });
    }
  } catch (error) {
    console.error("Error in deleteAll clients:", error);
    if (typeof error !== 'undefined' && typeof error === 'function') {
      return error(res, { message: "Failed to delete all clients", statusCode: 500 });
    } else {
      return res.status(500).json({ success: false, message: "Failed to delete all clients", error: error.message });
    }
  }
};
