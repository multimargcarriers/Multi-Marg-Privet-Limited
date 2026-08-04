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
    const snapshot = await db.collection("branches").get();
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
  await db.collection("branches").doc(id).delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, {
    message: "Branch deleted successfully"
  });
};

exports.deleteAll = async (req, res) => {
  try {
    if (db.mongoDb) {
      const branches = await db.mongoDb.collection("branches").find({}).toArray();
      if (branches.length > 0) {
        const trashDocs = branches.map(doc => ({
          originalCollection: "branches",
          document: doc,
          deletedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null
        }));
        await db.mongoDb.collection("trash").insertMany(trashDocs);
      }
      await db.mongoDb.collection("branches").deleteMany({});
    } else {
      // Fallback for strict firestore
      const snapshot = await db.collection("branches").get();
      const batches = [];
      let currentBatch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        currentBatch.delete(db.collection("branches").doc(doc.id));
        count++;
        
        if (count === 400) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          count = 0;
        }
      });
      
      if (count > 0) {
        batches.push(currentBatch.commit());
      }
      await Promise.all(batches);
    }
    
    await delCache(CACHE_KEY);
    return success(res, { message: "All branches deleted successfully" });
  } catch (err) {
    console.error("DeleteAll Error:", err);
    return error(res, "Failed to delete all branches: " + err.message, 500);
  }
};
