const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

const CACHE_KEY = "podEntries";

exports.getRoot_1 = async (req, res) => {
  const data = await getOrSet(CACHE_KEY, async () => {
    const snapshot = await db.collection("pod").orderBy("uploadedAt", "desc").get();
    const entries = [];
    snapshot.forEach(doc => entries.push({
      id: doc.id,
      ...doc.data()
    }));
    return entries;
  }, 300);
  return success(res, "POD entries fetched successfully", data);
};

exports.postRoot_2 = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return error(res, "Validation failed", 400, errors.array());
  const {
    lrNo,
    fileName,
    fileData,
    podType,
    bookingId,
    consignor,
    consignee,
    origin,
    destination,
    client,
    remarks
  } = req.body;

  const entry = {
    lrNo: lrNo || "UNKNOWN",
    fileName: fileName || "uploaded_file",
    podType: podType || "UNKNOWN", // "VERIFIED" vs "UNKNOWN"
    bookingId: bookingId || null,
    consignor: consignor || "-",
    consignee: consignee || "-",
    origin: origin || "-",
    destination: destination || "-",
    client: client || "-",
    remarks: remarks || "",
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // Upload to Cloudinary if file data is provided
  if (fileData) {
    try {
      const { uploadBase64 } = require("../config/cloudinary");
      const uploadResult = await uploadBase64(fileData, {
        folder: "multimarg/pod",
        originalName: fileName || `POD_${lrNo}_${Date.now()}.jpg`
      });

      if (uploadResult && uploadResult.success && uploadResult.url) {
        entry.cloudinaryUrl = uploadResult.url;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.podUrl = uploadResult.url;
      } else {
        console.error("[POD Controller] Upload failed:", uploadResult?.message);
        return error(res, `Cloudinary Upload Failed: ${uploadResult?.message || "Unknown error"}`, 400);
      }
    } catch (uploadErr) {
      console.error("[POD Cloudinary Error]", uploadErr.message);
      return error(res, `Cloudinary Upload Error: ${uploadErr.message}`, 500);
    }
  }

  const docRef = await db.collection("pod").add(entry);
  await delCache(CACHE_KEY);
  return created(res, "POD entry created successfully", {
    id: docRef.id,
    ...entry
  });
};

exports.deleteRoot_3 = async (req, res) => {
  const { id } = req.params;
  const docRef = db.collection("pod").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return error(res, "POD entry not found", 404);
  }
  const data = doc.data();
  if (data.cloudinaryPublicId || data.cloudinaryUrl) {
    try {
      const { deleteFile } = require("../config/cloudinary");
      await deleteFile(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete POD image from Cloudinary:", e.message);
    }
  }
  await docRef.delete();
  await delCache(CACHE_KEY);
  return success(res, "POD entry deleted successfully");
};
