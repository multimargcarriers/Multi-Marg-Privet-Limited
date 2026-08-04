const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

const CACHE_KEY = "cashEntries";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("cashEntries").orderBy("date", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "Cash entries fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  
  const entry = {
    amount: req.body.amount || 0,
    date: req.body.date || new Date().toISOString(),
    type: req.body.type,
    remarks: req.body.remarks || "",
    createdAt: new Date().toISOString()
  };

  if (req.body.fileData) {
    try {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/cash",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        entry.cloudinaryUrl = uploadResult.url;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.fileName = req.body.fileName || "cash_voucher";
      }
    } catch (uploadErr) {
      console.error("[CASH Cloudinary Error]", uploadErr.message);
    }
  }

  const docRef = await db.collection("cashEntries").add(entry);
  await delCache(CACHE_KEY);
  return created(res, "Cash entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.delete_id_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("cashEntries").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Cash entry not found", 404);
  
  const data = doc.data();
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFromCloudinary } = require("../utils/cloudinaryCleaner");
      await deleteFromCloudinary(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete Cash voucher from Cloudinary:", e.message);
    }
  }

  await docRef.delete(req.user);
  await delCache(CACHE_KEY);
  return success(res, "Cash entry deleted successfully");
};
