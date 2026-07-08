const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");

const CACHE_KEY = "voucherEntries";

if (!mockData.voucherEntries) {
  mockData.voucherEntries = [
    {
      id: "vch1",
      voucherNo: "VCH-001",
      fileName: "voucher_001.pdf",
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "vch2",
      voucherNo: "VCH-002",
      fileName: "voucher_002.pdf",
      uploadedAt: new Date().toISOString(),
    },
  ];
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) return mockData.voucherEntries;
        const snapshot = await db
          .collection("vouchers")
          .orderBy("uploadedAt", "desc")
          .get();
        const entries = [];
        snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));
        return entries;
      },
      300,
    );
    return success(res, "Voucher entries fetched successfully", data);
  }),
);

router.post(
  "/",
  [body("voucherNo").notEmpty().withMessage("Voucher number is required")],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const entry = req.body;
    entry.uploadedAt = new Date().toISOString();

    // Upload to Cloudinary if file data is provided
    if (entry.fileData) {
      try {
        const uploadResult = await uploadFile(entry.fileData, {
          folder: "multimarg/vouchers",
          resource_type: "auto",
        });
        entry.cloudinaryUrl = uploadResult.secure_url;
        entry.cloudinaryPublicId = uploadResult.public_id;
        delete entry.fileData;
      } catch (uploadErr) {
        // Fallback: keep local fileData
      }
    }

    if (useMockDB) {
      entry.id = uuidv4();
      mockData.voucherEntries.push(entry);
      await delCache(CACHE_KEY);
      return created(res, "Voucher entry created successfully", entry);
    }
    const docRef = await db.collection("vouchers").add(entry);
    await delCache(CACHE_KEY);
    return created(res, "Voucher entry created successfully", {
      id: docRef.id,
      ...entry,
    });
  }),
);

module.exports = router;
