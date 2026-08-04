const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

const CACHE_KEY = "cashEntries";

const { recalculatePartyPayments } = require("../utils/paymentUtils");
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
    partyType: req.body.partyType || "",
    partyName: req.body.partyName || "",
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
  
  await recalculatePartyPayments(entry.partyType, entry.partyName);

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
  await recalculatePartyPayments(data.partyType, data.partyName);
  return success(res, "Cash entry deleted successfully");
};

exports.put_id_4 = async (req, res) => {
    const { id } = req.params;
    const docRef = db.collection("cashEntries").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return error(res, "Cash entry not found", 404);

    let voucherUrl = req.body.voucherUrl;
    let cloudinaryUrl = req.body.cloudinaryUrl;
    let cloudinaryPublicId = req.body.cloudinaryPublicId;
    let fileName = req.body.fileName;

    if (req.files && req.files.voucher) {
      const file = req.files.voucher;
      const uploaded = await uploadFile(file.tempFilePath, "cash_vouchers");
      if (uploaded) {
        cloudinaryUrl = uploaded.url;
        cloudinaryPublicId = uploaded.public_id;
        voucherUrl = uploaded.url;
      }
    } else if (req.body.fileData) {
      const uploadResult = await uploadFile(req.body.fileData, {
        folder: "multimarg/cash",
        resourceType: "auto"
      });
      if (uploadResult && uploadResult.url) {
        cloudinaryUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
        voucherUrl = uploadResult.url;
      }
    }

    const updateData = {
      ...req.body,
      cloudinaryUrl: cloudinaryUrl || doc.data().cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId || doc.data().cloudinaryPublicId,
      voucherUrl: voucherUrl || doc.data().voucherUrl,
      fileName: fileName || doc.data().fileName,
      updatedAt: new Date().toISOString()
    };

    delete updateData.fileData;
    delete updateData.id;

    await docRef.update(updateData);
    await delCache(CACHE_KEY);
    runAnalyticsAggregation().catch(e => console.error("Auto analytics sync failed", e));
    
    
    const oldPartyName = doc.data().partyName;
    const oldPartyType = doc.data().partyType;
    const newPartyName = updateData.partyName || oldPartyName;
    const newPartyType = updateData.partyType || oldPartyType;
    
    if (oldPartyName && (oldPartyName !== newPartyName || oldPartyType !== newPartyType)) {
        await recalculatePartyPayments(oldPartyType, oldPartyName);
    }
    await recalculatePartyPayments(newPartyType, newPartyName);
    return success(res, "Cash entry updated successfully");
  };

  