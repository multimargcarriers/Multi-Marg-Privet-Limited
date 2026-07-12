const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "vendors";

// Get all vendors
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        const snapshot = await db.collection("vendors").get();
        const vendors = [];
        snapshot.forEach((doc) => {
          vendors.push({ id: doc.id, ...doc.data() });
        });
        return vendors;
      },
      300,
    );
    return success(res, { message: "Vendors fetched successfully", data });
  }),
);

// Create vendor
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Vendor name is required"),
    body("gst").notEmpty().withMessage("GST is required"),
    body("branch").notEmpty().withMessage("Branch is required"),
    body("mode").notEmpty().withMessage("Mode is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("contact").notEmpty().withMessage("Contact person is required"),
    body("phno").notEmpty().withMessage("Phone number is required"),
    body("email").notEmpty().isEmail().withMessage("Valid email is required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, { message: "Validation failed", statusCode: 400, details: errors.array() });
    }

    const newVendor = req.body;
    newVendor.status = "Active";
    newVendor.createdAt = new Date().toISOString();


    const docRef = await db.collection("vendors").add(newVendor);
    await delCache(CACHE_KEY);
    return created(res, { message: "Vendor created successfully", data: { id: docRef.id, ...newVendor } });
  }),
);
// Update vendor
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("vendors").doc(id).get();
    if (!doc.exists) return error(res, { message: "Vendor not found", statusCode: 404 });
    await db.collection("vendors").doc(id).update(req.body);
    await delCache(CACHE_KEY);
    return success(res, { message: "Vendor updated successfully", data: { id, ...req.body } });
  }),
);

// Delete vendor
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("vendors").doc(id).get();
    if (!doc.exists) return error(res, { message: "Vendor not found", statusCode: 404 });
    await db.collection("vendors").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, { message: "Vendor deleted successfully" });
  }),
);

module.exports = router;
