const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "purchaseReport";

// Get purchase report
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, vendor } = req.query;

    const data = await getOrSet(
      `${CACHE_KEY}_${from || "all"}_${to || "all"}_${vendor || "all"}`,
      async () => {

        let query = db.collection("purchases");
        if (vendor) query = query.where("vendor", "==", vendor);
        const snapshot = await query.orderBy("date", "desc").get();
        const purchases = [];
        snapshot.forEach((doc) =>
          purchases.push({ id: doc.id, ...doc.data() }),
        );

        let filtered = purchases;
        if (from)
          filtered = filtered.filter((p) => new Date(p.date) >= new Date(from));
        if (to)
          filtered = filtered.filter((p) => new Date(p.date) <= new Date(to));

        return {
          totalPurchases: filtered.reduce(
            (s, p) => s + parseFloat(p.total || 0),
            0,
          ),
          count: filtered.length,
          purchases: filtered.map((p) => ({
            vendor: p.vendor,
            date: p.date,
            items: p.items,
            total: p.total,
            remarks: p.remarks,
          })),
        };
      },
      600,
    );

    return success(res, "Purchase report fetched successfully", data);
  }),
);

// Get purchase summary
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;


    const snapshot = await db.collection("purchases").get();
    const purchases = [];
    snapshot.forEach((doc) => purchases.push({ id: doc.id, ...doc.data() }));

    let filtered = purchases;
    if (from)
      filtered = filtered.filter((p) => new Date(p.date) >= new Date(from));
    if (to) filtered = filtered.filter((p) => new Date(p.date) <= new Date(to));

    return success(res, "Purchase summary fetched successfully", {
      totalPurchases: filtered.reduce(
        (s, p) => s + parseFloat(p.total || 0),
        0,
      ),
      totalCount: filtered.length,
      averagePerPurchase:
        filtered.length > 0
          ? filtered.reduce((s, p) => s + parseFloat(p.total || 0), 0) /
            filtered.length
          : 0,
    });
  }),
);

module.exports = router;
