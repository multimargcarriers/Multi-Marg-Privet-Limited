const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

const CACHE_KEY = "podEntries";


// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/pod");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("pod")
          .orderBy("uploadedAt", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(res, "POD entries fetched successfully", data);
  }),
);

router.post(
  "/",
  [body("lrNo").notEmpty().withMessage("LR number is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const { lrNo, fileName, fileData } = req.body;
    const entry = {
      lrNo,
      fileName: fileName || "uploaded_file",
      uploadedAt: new Date().toISOString(),
    };

    // Upload to Cloudinary if file data is provided
    if (fileData) {
      try {
        const uploadResult = await uploadFile(fileData, {
          folder: "multimarg/pod",
          resource_type: "auto",
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
      ...entry,
    });
  }),
);

module.exports = router;
