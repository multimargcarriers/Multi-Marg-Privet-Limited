const { db } = require("../config/database");
const { success } = require("../utils/response");

exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "month", client } = req.query;

    const mongoDb = db.mongoDb;
    if (!mongoDb) {
      throw new Error("MongoDB connection not found in adapter.");
    }

    // 1. Setup Base Queries
    let matchQuery = {};
    if (startDate || endDate) {
      const createdAtQuery = {};
      if (startDate) createdAtQuery.$gte = startDate;
      if (endDate) createdAtQuery.$lte = endDate;
      matchQuery.createdAt = createdAtQuery;
    }

    if (client && client.trim() !== "") {
      matchQuery.client = { $regex: new RegExp(`^${client}$`, "i") };
    }

    // Grouping Date Formatter
    let dateGroupFormat = "%Y-%m";
    if (groupBy === "day") {
      dateGroupFormat = "%Y-%m-%d";
    } else if (groupBy === "year") {
      dateGroupFormat = "%Y";
    }

    let dateGroupId = { $dateToString: { format: dateGroupFormat, date: { $toDate: "$createdAt" } } };
    let dateGroupIdDate = { $dateToString: { format: dateGroupFormat, date: { $toDate: "$date" } } };

    if (groupBy === "week") {
      dateGroupId = {
        $concat: [
          { $toString: { $isoWeekYear: { $toDate: "$createdAt" } } },
          "-W",
          { $toString: { $isoWeek: { $toDate: "$createdAt" } } }
        ]
      };
      dateGroupIdDate = {
        $concat: [
          { $toString: { $isoWeekYear: { $toDate: "$date" } } },
          "-W",
          { $toString: { $isoWeek: { $toDate: "$date" } } }
        ]
      };
    }

    // --- PIPELINES ---

    // A. Financial Totals (Bills)
    const financialPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $toDouble: { $ifNull: ["$total", "$amount"] } } },
          paidAmount: { $sum: { $toDouble: "$paidAmount" } },
          taxLiability: { $sum: { $add: [{ $toDouble: "$cgst" }, { $toDouble: "$sgst" }, { $toDouble: "$igst" }] } },
          totalBills: { $sum: 1 }
        }
      }
    ];

    // B. Purchases (Expenses)
    let purchaseMatchQuery = {};
    if (startDate || endDate) {
      const pDateQuery = {};
      if (startDate) pDateQuery.$gte = startDate;
      if (endDate) pDateQuery.$lte = endDate;
      purchaseMatchQuery.date = pDateQuery;
    }

    const expensesPipeline = [
      { $match: purchaseMatchQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: { $toDouble: "$total" } }
        }
      }
    ];

    // C. Revenue & Expense Trend over time
    const revenueTrendPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: dateGroupId,
          revenue: { $sum: { $toDouble: { $ifNull: ["$total", "$amount"] } } }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const expenseTrendPipeline = [
      { $match: purchaseMatchQuery },
      {
        $group: {
          _id: dateGroupIdDate,
          expense: { $sum: { $toDouble: "$total" } }
        }
      },
      { $sort: { _id: 1 } }
    ];

    // D. Bookings / Trips
    let bookingsMatchQuery = { ...matchQuery };
    if (client && client.trim() !== "") {
      delete bookingsMatchQuery.client; // Bookings usually have 'clientName' or 'company_name'
      bookingsMatchQuery.$or = [
        { clientName: { $regex: new RegExp(`^${client}$`, "i") } },
        { company_name: { $regex: new RegExp(`^${client}$`, "i") } }
      ];
    }

    const bookingsTrendPipeline = [
      { $match: bookingsMatchQuery },
      {
        $group: {
          _id: dateGroupId,
          trips: { $sum: 1 },
          unbilledRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$status", "Billed"] }, { $ne: ["$status", "billed"] }] },
                { $toDouble: { $ifNull: ["$totalAmount", "$freight_charge"] } },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const originDestinationPipeline = [
      { $match: bookingsMatchQuery },
      {
        $group: {
          _id: { origin: "$origin", destination: "$destination" },
          trips: { $sum: 1 }
        }
      },
      { $sort: { trips: -1 } },
      { $limit: 10 }
    ];

    // E. Mode Distribution
    const modeDistributionPipeline = [
      { $match: bookingsMatchQuery },
      {
        $group: {
          _id: { $toLower: "$mode" },
          count: { $sum: 1 }
        }
      }
    ];

    // F. Client Insights (Only if no specific client is filtered)
    const clientSalesPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: "$client",
          revenue: { $sum: { $toDouble: { $ifNull: ["$total", "$amount"] } } },
          paid: { $sum: { $toDouble: "$paidAmount" } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 15 }
    ];

    // G. Cash Flow
    let cashFlowMatchQuery = {};
    if (startDate || endDate) {
      const cDateQuery = {};
      if (startDate) cDateQuery.$gte = startDate;
      if (endDate) cDateQuery.$lte = endDate;
      cashFlowMatchQuery.date = cDateQuery;
    }

    const cashFlowPipeline = [
      { $match: cashFlowMatchQuery },
      {
        $group: {
          _id: dateGroupIdDate,
          cashIn: { $sum: { $cond: [{ $eq: ["$type", "in"] }, { $toDouble: "$amount" }, 0] } },
          cashOut: { $sum: { $cond: [{ $eq: ["$type", "out"] }, { $toDouble: "$amount" }, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ];

    // 2. Execute all pipelines concurrently
    const [
      financialResult,
      expenseResult,
      revenueTrendResult,
      expenseTrendResult,
      bookingsTrendResult,
      originDestResult,
      modeResult,
      clientSalesResult,
      cashFlowResult,
      totalBookingsResult
    ] = await Promise.all([
      mongoDb.collection("bills").aggregate(financialPipeline).toArray(),
      mongoDb.collection("purchases").aggregate(expensesPipeline).toArray(),
      mongoDb.collection("bills").aggregate(revenueTrendPipeline).toArray(),
      mongoDb.collection("purchases").aggregate(expenseTrendPipeline).toArray(),
      mongoDb.collection("bookings").aggregate(bookingsTrendPipeline).toArray(),
      mongoDb.collection("bookings").aggregate(originDestinationPipeline).toArray(),
      mongoDb.collection("bookings").aggregate(modeDistributionPipeline).toArray(),
      mongoDb.collection("bills").aggregate(clientSalesPipeline).toArray(),
      mongoDb.collection("cashEntries").aggregate(cashFlowPipeline).toArray(),
      mongoDb.collection("bookings").countDocuments(bookingsMatchQuery)
    ]);

    // 3. Format Data
    const financial = financialResult[0] || { totalRevenue: 0, paidAmount: 0, taxLiability: 0, totalBills: 0 };
    financial.outstandingReceivables = financial.totalRevenue - financial.paidAmount;
    financial.totalExpenses = (expenseResult[0] || {}).totalExpenses || 0;

    // Merge Revenue and Expense Trend
    const financeTrendMap = {};
    revenueTrendResult.forEach(item => {
      if (item._id) financeTrendMap[item._id] = { name: item._id, revenue: item.revenue || 0, expense: 0 };
    });
    expenseTrendResult.forEach(item => {
      if (item._id) {
        if (!financeTrendMap[item._id]) financeTrendMap[item._id] = { name: item._id, revenue: 0, expense: 0 };
        financeTrendMap[item._id].expense = item.expense || 0;
      }
    });
    const financialTrendData = Object.values(financeTrendMap).sort((a, b) => a.name.localeCompare(b.name));

    let unbilledRevenueTotal = 0;
    const bookingsData = bookingsTrendResult.map(item => {
      unbilledRevenueTotal += (item.unbilledRevenue || 0);
      return { name: item._id, trips: item.trips || 0 };
    });

    const routeData = originDestResult.map(item => ({
      name: `${item._id.origin || "Unknown"} -> ${item._id.destination || "Unknown"}`,
      trips: item.trips
    }));

    const modeDistribution = modeResult.map(item => {
      let name = "Unknown";
      if (item._id) {
        if (item._id.includes("air")) name = "Air";
        else if (item._id.includes("train") || item._id.includes("rail")) name = "Train";
        else if (item._id.includes("road")) name = "Road";
        else name = String(item._id).charAt(0).toUpperCase() + String(item._id).slice(1);
      }
      return { name, value: item.count };
    });

    const salesByClient = clientSalesResult.map(item => ({
      name: item._id || "Unknown",
      revenue: item.revenue || 0,
      paid: item.paid || 0,
      outstanding: (item.revenue || 0) - (item.paid || 0)
    }));

    const cashFlowData = cashFlowResult.map(item => ({ name: item._id, In: item.cashIn || 0, Out: item.cashOut || 0 }));

    return success(res, "Advanced Analytics fetched successfully", {
      financial,
      totalBookings: totalBookingsResult,
      unbilledRevenue: unbilledRevenueTotal,
      financialTrendData,
      bookingsData,
      routeData,
      modeDistribution,
      salesByClient,
      cashFlowData
    });

  } catch (error) {
    console.error("Advanced Analytics Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
