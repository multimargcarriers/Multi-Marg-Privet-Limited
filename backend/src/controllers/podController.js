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
      const { uploadStream, uploadBase64 } = require("../config/cloudinary");
      let uploadResult = null;
      
      const base64Match = fileData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Str = base64Match[2];
        const buffer = Buffer.from(base64Str, "base64");
        
        let ext = mimeType.split("/")[1] || "jpg";
        if (ext === "jpeg") ext = "jpg";
        
        uploadResult = await uploadStream(buffer, {
          folder: "multimarg/pod",
          originalName: fileName || `POD_${lrNo}_${Date.now()}.${ext}`
        });
        console.log("[POD Controller] uploadStream result:", uploadResult);
      } else {
        // Fallback if not a standard data URI
        console.log("[POD Controller] Regex did not match, using uploadBase64 fallback.");
        uploadResult = await uploadBase64(fileData, { folder: "multimarg/pod" });
        console.log("[POD Controller] uploadBase64 result:", uploadResult);
      }
      if (uploadResult && uploadResult.url) {
        entry.cloudinaryUrl = uploadResult.url;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.podUrl = uploadResult.url;
      } else {
        console.error("[POD Controller] Upload failed, falling back to database base64 storage:", uploadResult?.message);
        entry.fileData = fileData;
      }
    } catch (uploadErr) {
      console.error("[POD Cloudinary Error]", uploadErr.message);
      entry.fileData = fileData;
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
      const { deleteFromCloudinary } = require("../utils/cloudinaryCleaner");
      await deleteFromCloudinary(data.cloudinaryPublicId || data.cloudinaryUrl);
    } catch (e) {
      console.warn("Failed to delete POD image from Cloudinary:", e.message);
    }
  }
  await docRef.delete();
  await delCache(CACHE_KEY);
  return success(res, "POD entry deleted successfully");
};
