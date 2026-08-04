const { emitDataUpdated } = require("../utils/socket");
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

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
  
  const purchase = {
    vendor: req.body.vendor || "",
    billNo: req.body.billNo || "",
    date: req.body.date || new Date().toISOString(),
    taxable: req.body.taxable || 0,
    gst: req.body.gst || 0,
    total: req.body.total || 0,
    createdAt: new Date().toISOString()
  };

  if (req.body.fileData) {
    try {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/purchases",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        purchase.cloudinaryUrl = uploadResult.url;
        purchase.cloudinaryPublicId = uploadResult.publicId;
        purchase.fileName = req.body.fileName || "purchase_bill";
      }
    } catch (uploadErr) {
      console.error("[PURCHASE Cloudinary Error]", uploadErr.message);
    }
  }

  const docRef = await db.collection("purchases").add(purchase);
  await delCache(CACHE_KEY);
  emitDataUpdated("purchases");
  return created(res, "Purchase created successfully", {
    id: docRef.id,
    ...purchase
  });
};

exports.delete_id_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("purchases").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return error(res, "Purchase not found", 404);
  
  const data = doc.data();
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFromCloudinary } = require("../utils/cloudinaryCleaner");
      await deleteFromCloudinary(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete Purchase bill from Cloudinary:", e.message);
    }
  }

  await docRef.delete(req.user);
  await delCache(CACHE_KEY);
  emitDataUpdated("purchases");
    return success(res, "Purchase deleted successfully");
};
