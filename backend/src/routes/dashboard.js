const express = require("express");
const router = express.Router();
const { useMockDB, db, mockData } = require("../config/firebase");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");

const CACHE_KEY = "dashboard_stats";

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const data = await getOrSet(
      CACHE_KEY,
      async () => {
        if (useMockDB) {
          return {
            newClients: mockData.clients?.length || 34,
            earnings: 285000,
            newBookings: mockData.bookings?.length || 210,
            totalInvoices: mockData.bills?.length || 1250,
            topLeaders: [
              {
                id: 1,
                name: "Dhruv Kumar",
                role: "Marketing Head",
                branch: "Pantnagar",
                phone: "9045015097",
              },
              {
                id: 2,
                name: "Dharmendra Puri",
                role: "Operations Head",
                branch: "Delhi",
                phone: "7503112217",
              },
              {
                id: 3,
                name: "Akash Debnath",
                role: "IT & Accounts Head",
                branch: "Jamshedpur",
                phone: "7209877637",
              },
            ],
          };
        }

        // Real Firebase Firestore logic
        const clientsSnapshot = await db.collection("clients").count().get();
        const invoicesSnapshot = await db.collection("invoices").count().get();
        const invoicesDocs = await db.collection("invoices").get();
        let totalEarnings = 0;
        invoicesDocs.forEach((doc) => {
          totalEarnings += doc.data().totalAmount || 0;
        });

        return {
          newClients: clientsSnapshot.data().count,
          earnings: totalEarnings,
          newBookings: 156,
          totalInvoices: invoicesSnapshot.data().count,
          topLeaders: [],
        };
      },
      60,
    ); // Short TTL for dashboard

    return success(res, "Dashboard stats fetched successfully", data);
  }),
);

module.exports = router;
