const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");

const CACHE_KEY = "purchases";


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {

        const snapshot = await db
          .collection("purchases")
          .orderBy("date", "desc")
          .get();
        const purchases = [];
        snapshot.forEach((doc) =>
          purchases.push({ id: doc.id, ...doc.data() }),
        );
        return purchases;
      },
      300,
    );
    return success(res, "Purchases fetched successfully", data);
  }),
);

router.post(
  "/",
  [
    body("vendor").notEmpty().withMessage("Vendor name is required"),
    body("billNo").notEmpty().withMessage("Vendor Bill No is required"),
    body("date").notEmpty().withMessage("Date is required"),
    body("taxable").isNumeric().withMessage("Taxable Value must be a number"),
    body("gst").isNumeric().withMessage("GST must be a number"),
    body("total").isNumeric().withMessage("Total must be a number"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return error(res, "Validation failed", 400, errors.array());

    const purchase = req.body;
    purchase.date = purchase.date || new Date().toISOString();
    purchase.createdAt = new Date().toISOString();
    const docRef = await db.collection("purchases").add(purchase);
    await delCache(CACHE_KEY);
    return created(res, "Purchase created successfully", {
      id: docRef.id,
      ...purchase,
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await db.collection("purchases").doc(id).get();
    if (!doc.exists) return error(res, "Purchase not found", 404);
    await db.collection("purchases").doc(id).delete();
    await delCache(CACHE_KEY);
    return success(res, "Purchase deleted successfully");
  }),
);

module.exports = router;
