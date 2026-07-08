const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "sales";

// Get sales report
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to, client } = req.query;

    const data = await getOrSet(
      `${CACHE_KEY}_${from || "all"}_${to || "all"}_${client || "all"}`,
      async () => {
        if (useMockDB) {
          let bills = [...(mockData.bills || [])];
          if (from)
            bills = bills.filter(
              (b) => new Date(b.createdAt) >= new Date(from),
            );
          if (to)
            bills = bills.filter((b) => new Date(b.createdAt) <= new Date(to));
          if (client)
            bills = bills.filter(
              (b) => b.client?.toLowerCase() === client.toLowerCase(),
            );

          return {
            totalSales: bills.reduce(
              (s, b) => s + parseFloat(b.total || b.amount || 0),
              0,
            ),
            totalTaxable: bills.reduce(
              (s, b) => s + parseFloat(b.taxable || b.amount || 0),
              0,
            ),
            totalGST: bills.reduce(
              (s, b) => s + parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0),
              0,
            ),
            count: bills.length,
            bills: bills.map((b) => ({
              billNo: b.billNo,
              client: b.client,
              date: b.createdAt,
              taxable: b.taxable || b.amount || 0,
              cgst: b.cgst || 0,
              sgst: b.sgst || 0,
              total: b.total || b.amount || 0,
              status: b.status,
            })),
          };
        }

        let query = db.collection("bills");
        if (client) query = query.where("client", "==", client);
        const snapshot = await query.orderBy("createdAt", "desc").get();
        const bills = [];
        snapshot.forEach((doc) => bills.push({ id: doc.id, ...doc.data() }));

        let filtered = bills;
        if (from)
          filtered = filtered.filter(
            (b) => new Date(b.createdAt) >= new Date(from),
          );
        if (to)
          filtered = filtered.filter(
            (b) => new Date(b.createdAt) <= new Date(to),
          );

        return {
          totalSales: filtered.reduce(
            (s, b) => s + parseFloat(b.total || b.amount || 0),
            0,
          ),
          totalTaxable: filtered.reduce(
            (s, b) => s + parseFloat(b.taxable || b.amount || 0),
            0,
          ),
          totalGST: filtered.reduce(
            (s, b) => s + parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0),
            0,
          ),
          count: filtered.length,
          bills: filtered.map((b) => ({
            billNo: b.billNo,
            client: b.client,
            date: b.createdAt,
            taxable: b.taxable || b.amount || 0,
            cgst: b.cgst || 0,
            sgst: b.sgst || 0,
            total: b.total || b.amount || 0,
            status: b.status,
          })),
        };
      },
      600,
    );

    return success(res, "Sales report fetched successfully", data);
  }),
);

// Get sales summary
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;

    if (useMockDB) {
      let bills = [...(mockData.bills || [])];
      if (from)
        bills = bills.filter((b) => new Date(b.createdAt) >= new Date(from));
      if (to)
        bills = bills.filter((b) => new Date(b.createdAt) <= new Date(to));

      return success(res, "Sales summary fetched successfully", {
        totalSales: bills.reduce(
          (s, b) => s + parseFloat(b.total || b.amount || 0),
          0,
        ),
        totalBills: bills.length,
        paidBills: bills.filter((b) => b.status === "paid").length,
        pendingBills: bills.filter((b) => b.status === "pending").length,
        averagePerBill:
          bills.length > 0
            ? bills.reduce(
                (s, b) => s + parseFloat(b.total || b.amount || 0),
                0,
              ) / bills.length
            : 0,
      });
    }

    const snapshot = await db.collection("bills").get();
    const bills = [];
    snapshot.forEach((doc) => bills.push({ id: doc.id, ...doc.data() }));

    let filtered = bills;
    if (from)
      filtered = filtered.filter(
        (b) => new Date(b.createdAt) >= new Date(from),
      );
    if (to)
      filtered = filtered.filter((b) => new Date(b.createdAt) <= new Date(to));

    return success(res, "Sales summary fetched successfully", {
      totalSales: filtered.reduce(
        (s, b) => s + parseFloat(b.total || b.amount || 0),
        0,
      ),
      totalBills: filtered.length,
      paidBills: filtered.filter((b) => b.status === "paid").length,
      pendingBills: filtered.filter((b) => b.status === "pending").length,
      averagePerBill:
        filtered.length > 0
          ? filtered.reduce(
              (s, b) => s + parseFloat(b.total || b.amount || 0),
              0,
            ) / filtered.length
          : 0,
    });
  }),
);

module.exports = router;
