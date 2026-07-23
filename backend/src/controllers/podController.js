const {
  db
} = require("../config/database");
const {
  v4: uuidv4
} = require("uuid");
const path = require("path");
const fs = require("fs");
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
const {
  uploadFile
} = require("../config/cloudinary");

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
    fileData
  } = req.body;
  const entry = {
    lrNo,
    fileName: fileName || "uploaded_file",
    uploadedAt: new Date().toISOString()
  };

  // Upload to Cloudinary if file data is provided
  if (fileData) {
    try {
      const uploadResult = await uploadFile(fileData, {
        folder: "multimarg/pod",
        resource_type: "auto"
      });
      entry.cloudinaryUrl = uploadResult.url;
      entry.cloudinaryPublicId = uploadResult.publicId;
    } catch (uploadErr) {
      // Fallback: continue without cloudinary
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

