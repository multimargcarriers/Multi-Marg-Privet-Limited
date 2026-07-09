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
        let clientsCount = 0;
        let totalCashIn = 0;
        let totalCashOut = 0;
        let totalBillsAmount = 0;
        let totalBookings = 0;
        
        let rawCash = [];
        let rawBills = [];
        let rawBookings = [];

        if (useMockDB) {
          clientsCount = mockData.clients?.length || 0;
          totalBookings = mockData.bookings?.length || 0;
          rawCash = mockData.cashEntries || [];
          rawBills = mockData.bills || [];
          rawBookings = mockData.bookings || [];
        } else {
          // Real Firebase Firestore logic
          const clientsSnapshot = await db.collection("clients").count().get();
          clientsCount = clientsSnapshot.data().count;

          const bookingsSnapshot = await db.collection("bookings").get();
          totalBookings = bookingsSnapshot.size;
          bookingsSnapshot.forEach(doc => rawBookings.push(doc.data()));

          const cashSnapshot = await db.collection("cashEntries").get();
          cashSnapshot.forEach(doc => rawCash.push(doc.data()));

          const billsSnapshot = await db.collection("bills").get();
          billsSnapshot.forEach(doc => rawBills.push(doc.data()));
        }

        // Aggregate Cash
        rawCash.forEach(entry => {
          if (entry.type === "in") totalCashIn += (Number(entry.amount) || 0);
          if (entry.type === "out") totalCashOut += (Number(entry.amount) || 0);
        });

        // Aggregate Bills
        rawBills.forEach(bill => {
          totalBillsAmount += (Number(bill.amount) || 0);
        });

        // Generate Revenue Trend (Last 6 Months)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let revenueByMonth = {};
        
        // Populate last 6 months with 0
        const d = new Date();
        for (let i = 5; i >= 0; i--) {
          const d2 = new Date(d.getFullYear(), d.getMonth() - i, 1);
          revenueByMonth[`${monthNames[d2.getMonth()]} ${d2.getFullYear()}`] = 0;
        }

        // Add Bills to Revenue
        rawBills.forEach(bill => {
          if (!bill.createdAt) return;
          const bd = new Date(bill.createdAt);
          const key = `${monthNames[bd.getMonth()]} ${bd.getFullYear()}`;
          if (revenueByMonth[key] !== undefined) {
            revenueByMonth[key] += (Number(bill.amount) || 0);
          }
        });

        // Also add Cash In to Revenue if needed? The user said "based on data cash and bills". 
        // We'll just show Cash In as an independent stat, and keep Revenue as Bills.
        // Or we can add Cash In to revenue. Let's add Cash In as well.
        rawCash.forEach(entry => {
          if (entry.type === 'in' && entry.date) {
            const cd = new Date(entry.date);
            const key = `${monthNames[cd.getMonth()]} ${cd.getFullYear()}`;
            if (revenueByMonth[key] !== undefined) {
              revenueByMonth[key] += (Number(entry.amount) || 0);
            }
          }
        });

        const revenueData = Object.keys(revenueByMonth).map(key => ({
          name: key.split(' ')[0], // Just month name for chart
          revenue: revenueByMonth[key]
        }));

        // Group Bookings by Region (Origin)
        const bookingsCount = {};
        rawBookings.forEach(b => {
          if (!b.origin) return;
          bookingsCount[b.origin] = (bookingsCount[b.origin] || 0) + 1;
        });

        let bookingsData = Object.keys(bookingsCount).map(city => ({
          name: city,
          bookings: bookingsCount[city]
        })).sort((a, b) => b.bookings - a.bookings).slice(0, 5); // Top 5

        if (bookingsData.length === 0) {
          bookingsData = [
            { name: "No Data", bookings: 0 }
          ];
        }

        return {
          totalClients: clientsCount,
          totalBookings: totalBookings,
          totalCashIn,
          totalCashOut,
          totalBillsAmount,
          revenueData,
          bookingsData,
          topLeaders: [
            { name: "Dhruv Kumar", role: "Marketing Head", branch: "Pantnagar", phone: "9045015097" },
            { name: "Dharmendra Puri", role: "Operations Head", branch: "Delhi", phone: "7503112217" },
            { name: "Akash Debnath", role: "IT Head", branch: "Jamshedpur", phone: "7209877637" },
          ]
        };
      },
      30 // TTL of 30 seconds for near real-time updates
    );

    return success(res, "Dashboard stats fetched successfully", data);
  })
);

module.exports = router;
