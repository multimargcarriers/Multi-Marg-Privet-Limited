const cron = require("node-cron");
const { db } = require("../config/database");

const runAnalyticsAggregation = async () => {
  try {
    console.log("[Analytics Job] Starting analytics aggregation using MongoDB cursors (O(1) memory)...");
    
    // Access the raw MongoDB connection to avoid the Firestore adapter wrapper overhead
    const mongoDb = db.mongoDb;
    if (!mongoDb) {
      throw new Error("MongoDB connection not found in adapter.");
    }

    const [totalClients, totalBookings] = await Promise.all([
      mongoDb.collection("clients").countDocuments(),
      mongoDb.collection("bookings").countDocuments()
    ]);

    // ----------------------------------------------------
    // Analytics Stats initialization
    // ----------------------------------------------------
    let currentBillsTotal = 0;
    let currentBillsPaid = 0;
    let currentBillsTds = 0;
    let currentBillsDebt = 0;
    let taxLiability = 0;

    let unbilledRevenue = 0;
    let unbilledAwbCount = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    let totalPurchaseBills = 0;
    let currentPurchasesTotal = 0;
    let currentPurchasesPaid = 0;
    let currentPurchasesTds = 0;
    let currentPurchasesDebt = 0;
    let totalPurchaseGst = 0;
    
    const clientSalesMap = {};
    const bookingsCount = {};
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cashFlowMap = {};
    const revenueByMonth = {};
    const d = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${monthNames[d2.getMonth()]} ${d2.getFullYear()}`;
      cashFlowMap[key] = { name: monthNames[d2.getMonth()], In: 0, Out: 0 };
      revenueByMonth[key] = 0;
    }

    const normalizePartyKey = (name) => {
      if (!name) return "";
      let s = String(name).toLowerCase().trim().replace(/[\s\-_.,/()]+/g, " ").trim();
      if (s === "sky 4 logistics" || s === "sky 4") s = "sky 4 pune";
      if (s === "cj darcl") s = "cj darcl logistics limited";
      return s;
    };

    const clientMap = new Map();
    const vendorMap = new Map();

    const getClientParty = (name) => {
      const k = normalizePartyKey(name);
      if (!k) return null;
      if (!clientMap.has(k)) clientMap.set(k, { invoiced: 0, paid: 0, tds: 0, debt: 0 });
      return clientMap.get(k);
    };

    const getVendorParty = (name) => {
      const k = normalizePartyKey(name);
      if (!k) return null;
      if (!vendorMap.has(k)) vendorMap.set(k, { invoiced: 0, paid: 0, tds: 0, debt: 0 });
      return vendorMap.get(k);
    };

    let currentBillsDue = 0;
    let currentPurchasesDue = 0;
    let clientOpeningDueSum = 0;
    let vendorOpeningDueSum = 0;

    // 1. Process Bills via streaming cursor (O(1) memory footprint)
    const billsCursor = mongoDb.collection("bills").find({}, { 
      projection: { total: 1, amount: 1, status: 1, cgst: 1, sgst: 1, igst: 1, client: 1, billedTo: 1, createdAt: 1, paidAmount: 1, tdsAmount: 1, debtAmount: 1 } 
    });

    for await (const bill of billsCursor) {
      const amt = Number(bill.total || bill.amount) || 0;
      const paid = Number(bill.paidAmount) || 0;
      const tds = Number(bill.tdsAmount) || 0;
      const debt = Number(bill.debtAmount) || 0;
      const isCancelled = String(bill.status || "").toLowerCase() === "cancelled";

      if (!isCancelled) {
        currentBillsTotal += amt;
        currentBillsPaid += paid;
        currentBillsTds += tds;
        currentBillsDebt += debt;
        currentBillsDue += Math.max(0, amt - paid - tds - debt);

        const cgst = Number(bill.cgst) || 0;
        const sgst = Number(bill.sgst) || 0;
        const igst = Number(bill.igst) || 0;
        taxLiability += (cgst + sgst + igst);

        const clientName = bill.client || bill.billedTo;
        if (clientName) {
          clientSalesMap[clientName] = (clientSalesMap[clientName] || 0) + amt;
          const cp = getClientParty(clientName);
          if (cp) {
            cp.invoiced += amt;
            cp.paid += paid;
            cp.tds += tds;
            cp.debt += debt;
          }
        }
      }
    }

    // 2. Process Bookings via streaming cursor
    const bookingsCursor = mongoDb.collection("bookings").find({}, { 
      projection: { status: 1, billed: 1, totalAmount: 1, freight_charge: 1, chargedWeight: 1, origin: 1 } 
    });

    for await (const booking of bookingsCursor) {
      if (booking.billed === false || (booking.billed !== true && String(booking.status || "").toLowerCase() !== "billed")) {
        unbilledAwbCount++;
        let bookingRev = Number(booking.totalAmount) || Number(booking.freight_charge);
        if (!bookingRev && booking.chargedWeight) {
            bookingRev = Number(booking.chargedWeight) * 12.5;
        }
        unbilledRevenue += bookingRev || 0;
      }
      
      if (booking.origin) {
         bookingsCount[booking.origin] = (bookingsCount[booking.origin] || 0) + 1;
      }
    }

    // 3. Process Cash Entries via streaming cursor
    const cashCursor = mongoDb.collection("cashEntries").find({}, { 
      projection: { type: 1, amount: 1, date: 1, partyType: 1, partyName: 1 } 
    });
    
    for await (const c of cashCursor) {
      const amt = Number(c.amount) || 0;
      if (c.type === "in") totalCashIn += amt;
      if (c.type === "out") totalCashOut += amt;
        
      if (c.date) {
        const cd = new Date(c.date);
        if (!isNaN(cd.getTime())) {
          const key = `${monthNames[cd.getMonth()]} ${cd.getFullYear()}`;
          if (cashFlowMap[key]) {
            if (c.type === 'in') {
               cashFlowMap[key].In += amt;
               revenueByMonth[key] += amt;
            } else {
               cashFlowMap[key].Out += amt;
            }
          }
        }
      }
    }

    // 4. Process Purchases via streaming cursor
    const purchasesCursor = mongoDb.collection("purchases").find({}, {
      projection: { total: 1, gst: 1, taxable: 1, paidAmount: 1, tdsAmount: 1, debtAmount: 1, status: 1, vendor: 1, vendorName: 1 }
    });

    for await (const p of purchasesCursor) {
      const amt = Number(p.total) || 0;
      const paid = Number(p.paidAmount) || 0;
      const tds = Number(p.tdsAmount) || 0;
      const debt = Number(p.debtAmount) || 0;
      const isCancelled = String(p.status || "").toLowerCase() === "cancelled";

      if (!isCancelled) {
        totalPurchaseBills++;
        currentPurchasesTotal += amt;
        totalPurchaseGst += (Number(p.gst) || 0);

        currentPurchasesPaid += paid;
        currentPurchasesTds += tds;
        currentPurchasesDebt += debt;
        currentPurchasesDue += Math.max(0, amt - paid - tds - debt);

        const vName = p.vendor || p.vendorName;
        if (vName) {
          const vp = getVendorParty(vName);
          if (vp) {
            vp.invoiced += amt;
            vp.paid += paid;
            vp.tds += tds;
            vp.debt += debt;
          }
        }
      }
    }

    // 5. Process Opening Balances via streaming cursor
    const openingCursor = mongoDb.collection("openingBalances").find({}, {
      projection: { openingOutstanding: 1, initialOpeningDue: 1, totalBilledPrior: 1, totalPaidPrior: 1, totalTdsPrior: 1, totalDebtPrior: 1, amount: 1, partyType: 1, partyName: 1, client: 1, vendor: 1 }
    });

    let priorClientBilled = 0;
    let priorClientPaid = 0;
    let priorClientTds = 0;
    let priorClientDebt = 0;

    let priorVendorBilled = 0;
    let priorVendorPaid = 0;
    let priorVendorTds = 0;
    let priorVendorDebt = 0;

    for await (const op of openingCursor) {
      const pType = String(op.partyType || (op.vendor ? "vendor" : "client")).toLowerCase();
      const priorB = Number(
        op.totalBilledPrior !== undefined && Number(op.totalBilledPrior) > 0
          ? op.totalBilledPrior
          : (Number(op.openingOutstanding) || Number(op.initialOpeningDue) || Number(op.amount) || 0)
      ) || 0;
      const priorP = Number(op.totalPaidPrior) || 0;
      const priorT = Number(op.totalTdsPrior) || 0;
      const priorD = Number(op.totalDebtPrior) || 0;
      const openDue = Number(
        op.openingOutstanding !== undefined && op.openingOutstanding !== null
          ? op.openingOutstanding
          : Math.max(0, priorB - priorP - priorT - priorD)
      ) || 0;

      const effectivePriorBilled = Math.max(priorB, openDue + priorP + priorT + priorD);
      const partyName = op.partyName || op.client || op.vendor;

      if (pType === "vendor") {
        priorVendorBilled += effectivePriorBilled;
        priorVendorPaid += priorP;
        priorVendorTds += priorT;
        priorVendorDebt += priorD;
        vendorOpeningDueSum += openDue;

        if (partyName) {
          const vp = getVendorParty(partyName);
          if (vp) {
            vp.invoiced += effectivePriorBilled;
            vp.paid += priorP;
            vp.tds += priorT;
            vp.debt += priorD;
          }
        }
      } else {
        priorClientBilled += effectivePriorBilled;
        priorClientPaid += priorP;
        priorClientTds += priorT;
        priorClientDebt += priorD;
        clientOpeningDueSum += openDue;

        if (partyName) {
          const cp = getClientParty(partyName);
          if (cp) {
            cp.invoiced += effectivePriorBilled;
            cp.paid += priorP;
            cp.tds += priorT;
            cp.debt += priorD;
          }
        }
      }
    }

    // 6. Process TDS and Debt Adjustments via streaming cursor
    const adjCursor = mongoDb.collection("outstanding").find({}, {
      projection: { partyType: 1, client: 1, vendor: 1, partyName: 1, particulars: 1, amount: 1 }
    });

    let adjClientTds = 0;
    let adjClientDebt = 0;
    let adjVendorTds = 0;
    let adjVendorDebt = 0;

    for await (const adj of adjCursor) {
      const pType = String(adj.partyType || (adj.vendor ? "vendor" : "client")).toLowerCase();
      const amt = Number(adj.amount) || 0;
      const part = String(adj.particulars || "tds").toLowerCase();
      const partyName = adj.client || adj.vendor || adj.partyName;

      if (pType === "vendor") {
        if (part === "tds") adjVendorTds += amt;
        else adjVendorDebt += amt;

        if (partyName) {
          const vp = getVendorParty(partyName);
          if (vp) {
            if (part === "tds") vp.tds += amt;
            else vp.debt += amt;
          }
        }
      } else {
        if (part === "tds") adjClientTds += amt;
        else adjClientDebt += amt;

        if (partyName) {
          const cp = getClientParty(partyName);
          if (cp) {
            if (part === "tds") cp.tds += amt;
            else cp.debt += amt;
          }
        }
      }
    }

    // Master Exact Outstanding Calculation: Client Opening Dues + Current Unpaid Bills Due
    const outstandingReceivables = clientOpeningDueSum + currentBillsDue;
    const outstandingPurchases = vendorOpeningDueSum + currentPurchasesDue;

    const totalClientInvoiced = priorClientBilled + currentBillsTotal;
    const totalClientPaid = priorClientPaid + currentBillsPaid;
    const totalVendorInvoiced = priorVendorBilled + currentPurchasesTotal;
    const totalVendorPaid = priorVendorPaid + currentPurchasesPaid;

    // Compile results
    let bookingsData = Object.keys(bookingsCount).map(city => ({
      name: city,
      bookings: bookingsCount[city]
    })).sort((a, b) => b.bookings - a.bookings).slice(0, 5);
    
    if (bookingsData.length === 0) bookingsData = [{ name: "No Data", bookings: 0 }];

    let salesByClient = Object.keys(clientSalesMap)
      .map(client => ({ name: client, value: clientSalesMap[client] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    if (salesByClient.length === 0) salesByClient = [{ name: 'No Data', value: 0 }];

    const financialStatusData = [
      { name: 'Paid', value: totalClientPaid },
      { name: 'Outstanding', value: outstandingReceivables }
    ];

    const cashFlowData = Object.values(cashFlowMap);
    const revenueData = Object.keys(revenueByMonth).map(key => ({
      name: key.split(' ')[0],
      revenue: revenueByMonth[key]
    }));

    // Fetch Top Leaders (Users with role SuperAdmin, Admin, or Manager)
    const leadersCursor = mongoDb.collection("users").find(
      { role: { $in: ["SuperAdmin", "Admin", "Manager"] } },
      { projection: { name: 1, role: 1, branch: 1, phone: 1 }, limit: 5 }
    );
    const topLeaders = [];
    for await (const u of leadersCursor) {
      topLeaders.push({
        name: u.name || "Admin",
        role: u.role || "Manager",
        branch: u.branch || "HO",
        phone: u.phone || "-"
      });
    }
    if (topLeaders.length === 0) {
      topLeaders.push({ name: "System Admin", role: "SuperAdmin", branch: "HO", phone: "-" });
    }

    const summaryData = {
      // Analytics Page
      outstandingReceivables,
      paidAmount: totalClientPaid,
      taxLiability,
      unbilledRevenue,
      unbilledAwbCount,
      salesByClient,
      financialStatusData,
      cashFlowData,
      // Dashboard Page
      totalClients,
      totalBookings,
      totalCashIn,
      totalCashOut,
      totalBillsAmount: currentBillsTotal,
      totalCustomerInvoiced: totalClientInvoiced,
      totalClientInvoiced,
      totalPurchaseBills,
      totalPurchaseValue: currentPurchasesTotal,
      totalPurchaseGst,
      totalVendorInvoiced,
      outstandingPurchases,
      revenueData,
      bookingsData,
      topLeaders,
      lastUpdated: new Date().toISOString()
    };

    // Save to Firestore adapter mapped collection
    await db.collection("analytics").doc("summary").set(summaryData);
    
    console.log("[Analytics Job] Aggregation completed successfully without blocking the event loop.");
    return summaryData;
  } catch (error) {
    console.error("[Analytics Job] Error during aggregation:", error);
    throw error;
  }
};

const initAnalyticsCron = () => {
  cron.schedule("0 0 * * *", async () => {
    await runAnalyticsAggregation();
  });
  console.log("[Cron] Analytics aggregation job scheduled for 12:00 AM daily.");
};

module.exports = {
  runAnalyticsAggregation,
  initAnalyticsCron
};
