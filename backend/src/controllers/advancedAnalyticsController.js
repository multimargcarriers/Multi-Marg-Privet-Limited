const { db } = require("../config/database");
const { success } = require("../utils/response");
const { getCache, setCache } = require("../config/redis");

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parseAnyDate = (dStr) => {
  if (!dStr) return null;
  if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
  if (typeof dStr === 'number') {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(dStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const getGroupKey = (dateObj, groupBy) => {
  if (!dateObj) return "Unknown";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  if (groupBy === "day") return `${y}-${m}-${d}`;
  if (groupBy === "year") return `${y}`;
  if (groupBy === "week") {
    const startOfYear = new Date(y, 0, 1);
    const pastDaysOfYear = (dateObj - startOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${y}-W${String(weekNum).padStart(2, '0')}`;
  }
  return `${y}-${m}`;
};

exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "month", client } = req.query;
    const mongoDb = db.mongoDb;


    const fromMillis = startDate ? new Date(startDate).getTime() : null;
    const toMillis = endDate ? new Date(endDate).getTime() : null;
    const clientRegex = client && client.trim() ? new RegExp(escapeRegExp(client.trim()), "i") : null;

    // Fetch all collections in parallel
    const [clients, vendors, bills, purchases, bookings, trips, cashEntries, openingBalances] = await Promise.all([
      mongoDb ? mongoDb.collection("clients").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("vendors").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("bills").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("purchases").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("bookings").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("trips").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("cashEntries").find({}).toArray() : [],
      mongoDb ? mongoDb.collection("openingBalances").find({}).toArray() : []
    ]);

    const normalizeKey = (s) => String(s || '').toLowerCase().trim().replace(/[\s\-_.,/()]+/g, " ");

    // Initialize all clients and vendors
    const clientMap = new Map();
    clients.forEach(c => {
      const k = normalizeKey(c.name);
      if (!k) return;
      clientMap.set(k, {
        id: c._id || c.id,
        name: c.name,
        city: c.city || c.branch || '',
        phone: c.phone || c.contact || '',
        gst: c.gst || c.gstin || '',
        totalBookings: 0,
        unbilledBookings: 0,
        unbilledAmount: 0,
        revenue: 0,
        paid: 0,
        outstanding: 0
      });
    });

    const vendorMap = new Map();
    vendors.forEach(v => {
      const k = normalizeKey(v.name);
      if (!k) return;
      vendorMap.set(k, {
        id: v._id || v.id,
        name: v.name,
        city: v.city || v.branch || '',
        phone: v.phone || v.phno || '',
        gst: v.gst || v.gstin || '',
        totalTrips: 0,
        revenue: 0,
        paid: 0,
        outstanding: 0
      });
    });

    // 1. Calculate opening balances totals
    let clientOpeningOutstanding = 0;
    let priorClientBilled = 0;
    let priorClientPaid = 0;

    let vendorOpeningOutstanding = 0;
    let priorVendorBilled = 0;
    let priorVendorPaid = 0;

    openingBalances.forEach(op => {
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

      if (partyName) {
        const k = normalizeKey(partyName);
        if (pType === "vendor") {
          if (!vendorMap.has(k)) {
            vendorMap.set(k, {
              id: op._id || op.id,
              name: partyName,
              city: '',
              phone: '',
              gst: '',
              totalTrips: 0,
              revenue: 0,
              paid: 0,
              outstanding: 0
            });
          }
          const v = vendorMap.get(k);
          v.revenue += effectivePriorBilled;
          v.paid += priorP + priorT + priorD;
        } else {
          if (!clientMap.has(k)) {
            clientMap.set(k, {
              id: op._id || op.id,
              name: partyName,
              city: '',
              phone: '',
              gst: '',
              totalBookings: 0,
              unbilledBookings: 0,
              unbilledAmount: 0,
              revenue: 0,
              paid: 0,
              outstanding: 0
            });
          }
          const c = clientMap.get(k);
          c.revenue += effectivePriorBilled;
          c.paid += priorP + priorT + priorD;
        }
      }

      if (pType === "vendor") {
        priorVendorBilled += effectivePriorBilled;
        priorVendorPaid += priorP + priorT + priorD;
        vendorOpeningOutstanding += openDue;
      } else {
        priorClientBilled += effectivePriorBilled;
        priorClientPaid += priorP + priorT + priorD;
        clientOpeningOutstanding += openDue;
      }
    });

    // 2. Filter Bills
    const filteredBills = bills.filter(b => {
      const d = parseAnyDate(b.date || b.createdAt);
      if (fromMillis && (!d || d.getTime() < fromMillis)) return false;
      if (toMillis && (!d || d.getTime() > toMillis)) return false;
      if (clientRegex) {
        const clientVal = b.client || b.clientName || '';
        if (!clientRegex.test(clientVal)) return false;
      }
      return true;
    });

    // 3. Filter Purchases
    const filteredPurchases = purchases.filter(p => {
      const d = parseAnyDate(p.date || p.createdAt);
      if (fromMillis && (!d || d.getTime() < fromMillis)) return false;
      if (toMillis && (!d || d.getTime() > toMillis)) return false;
      return true;
    });

    // 4. Filter Bookings
    const filteredBookings = bookings.filter(bk => {
      const d = parseAnyDate(bk.date || bk.createdAt);
      if (fromMillis && (!d || d.getTime() < fromMillis)) return false;
      if (toMillis && (!d || d.getTime() > toMillis)) return false;
      if (clientRegex) {
        const cVal = bk.clientName || bk.company_name || bk.consignor || bk.consignee || '';
        if (!clientRegex.test(cVal)) return false;
      }
      return true;
    });

    // 5. Financial Calculations
    let currentBillsTotal = 0;
    let currentBillsPaid = 0;
    let currentBillsDue = 0;
    let taxLiability = 0;
    const financeTrendMap = {};

    filteredBills.forEach(b => {
      const rev = parseFloat(b.total || b.amount || b.grand_total || 0) || 0;
      const paid = parseFloat(b.paidAmount || b.paid || 0) || 0;
      const tax = parseFloat(b.taxLiability || ((parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0) + parseFloat(b.igst || 0)))) || 0;
      const isCancelled = String(b.status || "").toLowerCase() === "cancelled";

      if (!isCancelled) {
        currentBillsTotal += rev;
        currentBillsPaid += paid;
        currentBillsDue += Math.max(0, rev - paid - parseFloat(b.tdsAmount || 0) - parseFloat(b.debtAmount || 0));
        taxLiability += tax;

        const d = parseAnyDate(b.date || b.createdAt);
        const groupKey = getGroupKey(d, groupBy);
        if (!financeTrendMap[groupKey]) {
          financeTrendMap[groupKey] = { name: groupKey, revenue: 0, expense: 0 };
        }
        financeTrendMap[groupKey].revenue += rev;

        const cName = b.client || b.clientName || "Unknown";
        const k = normalizeKey(cName);
        if (!clientMap.has(k)) {
          clientMap.set(k, {
            id: b._id || b.id,
            name: cName,
            city: '',
            phone: '',
            gst: '',
            totalBookings: 0,
            unbilledBookings: 0,
            unbilledAmount: 0,
            revenue: 0,
            paid: 0,
            outstanding: 0
          });
        }
        const c = clientMap.get(k);
        c.revenue += rev;
        c.paid += paid;
      }
    });

    const totalRevenue = priorClientBilled + currentBillsTotal;
    const paidAmount = priorClientPaid + currentBillsPaid;
    const outstandingReceivables = clientOpeningOutstanding + currentBillsDue;

    // Expense calculations
    let currentPurchasesTotal = 0;
    let currentPurchasesPaid = 0;
    let currentPurchasesDue = 0;

    filteredPurchases.forEach(p => {
      const exp = parseFloat(p.total || p.amount || 0) || 0;
      const paid = parseFloat(p.paidAmount || 0) || 0;
      const isCancelled = String(p.status || "").toLowerCase() === "cancelled";

      if (!isCancelled) {
        currentPurchasesTotal += exp;
        currentPurchasesPaid += paid;
        currentPurchasesDue += Math.max(0, exp - paid - parseFloat(p.tdsAmount || 0) - parseFloat(p.debtAmount || 0));

        const d = parseAnyDate(p.date || p.createdAt);
        const groupKey = getGroupKey(d, groupBy);
        if (!financeTrendMap[groupKey]) {
          financeTrendMap[groupKey] = { name: groupKey, revenue: 0, expense: 0 };
        }
        financeTrendMap[groupKey].expense += exp;

        const vName = p.vendor || p.vendorName || "Unknown";
        const k = normalizeKey(vName);
        if (!vendorMap.has(k)) {
          vendorMap.set(k, {
            id: p._id || p.id,
            name: vName,
            city: '',
            phone: '',
            gst: '',
            totalTrips: 0,
            revenue: 0,
            paid: 0,
            outstanding: 0
          });
        }
        const v = vendorMap.get(k);
        v.revenue += exp;
        v.paid += paid;
      }
    });

    const totalExpenses = priorVendorBilled + currentPurchasesTotal;
    const totalExpensesPaid = priorVendorPaid + currentPurchasesPaid;
    const outstandingPayables = vendorOpeningOutstanding + currentPurchasesDue;
    const profitOrLoss = totalRevenue - totalExpenses;
    const netCashFlow = paidAmount - totalExpensesPaid;

    const financialTrendData = Object.values(financeTrendMap).sort((a, b) => a.name.localeCompare(b.name));

    // Construct set of all billed AWBs from bills
    const billedAwbSet = new Set();
    bills.forEach(b => {
      if (Array.isArray(b.bookings)) {
        b.bookings.forEach(bk => {
          const awb = typeof bk === 'string' ? bk : (bk.awb || bk.consignment || bk.lrNo || bk.lrNumber);
          if (awb) billedAwbSet.add(normalizeKey(awb));
        });
      }
      if (Array.isArray(b.items)) {
        b.items.forEach(it => {
          const awb = it.awb || it.consignment || it.lrNo || it.lrNumber;
          if (awb) billedAwbSet.add(normalizeKey(awb));
        });
      }
    });

    // Bookings & Route Insights
    const bookingTrendMap = {};
    const routeMap = {};
    const modeMap = {};
    let unbilledRevenueTotal = 0;
    let billedBookingsCount = 0;
    let unbilledBookingsCount = 0;

    filteredBookings.forEach(bk => {
      const d = parseAnyDate(bk.date || bk.createdAt);
      const groupKey = getGroupKey(d, groupBy);
      if (!bookingTrendMap[groupKey]) {
        bookingTrendMap[groupKey] = { name: groupKey, trips: 0 };
      }
      bookingTrendMap[groupKey].trips += 1;

      const rawAwb = normalizeKey(bk.awb || bk.consignment || bk.lrNo || bk.lrNumber || '');
      const status = String(bk.status || bk.billingStatus || '').toLowerCase();
      const isBilled = bk.billed === true || status === 'billed' || (bk.billNo && String(bk.billNo).trim() !== '') || billedAwbSet.has(rawAwb);
      const amt = parseFloat(bk.totalAmount || bk.freight_charge || bk.total || 0) || 0;

      if (isBilled) {
        billedBookingsCount++;
      } else {
        unbilledBookingsCount++;
        unbilledRevenueTotal += amt;
      }

      const clientParty = bk.clientName || bk.company_name || bk.consignor || '';
      if (clientParty) {
        const k = normalizeKey(clientParty);
        if (clientMap.has(k)) {
          const c = clientMap.get(k);
          c.totalBookings++;
          if (!isBilled) {
            c.unbilledBookings++;
            c.unbilledAmount += amt;
          }
        }
      }

      const org = (bk.origin || bk.from || 'Unknown').toUpperCase();
      const dst = (bk.destination || bk.to || 'Unknown').toUpperCase();
      const rKey = `${org} -> ${dst}`;
      routeMap[rKey] = (routeMap[rKey] || 0) + 1;

      const mKey = String(bk.mode || 'Road').toLowerCase();
      modeMap[mKey] = (modeMap[mKey] || 0) + 1;
    });

    // Process Trips to count trips per vendor
    trips.forEach(tp => {
      const vName = tp.vendor || tp.vendorName || '';
      if (vName) {
        const k = normalizeKey(vName);
        if (vendorMap.has(k)) {
          vendorMap.get(k).totalTrips++;
        }
      }
    });

    const bookingsData = Object.values(bookingTrendMap).sort((a, b) => a.name.localeCompare(b.name));
    const routeData = Object.entries(routeMap)
      .map(([name, trips]) => ({ name, trips }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 10);

    // Aggregate and deduplicate modes by name
    const aggregatedModes = {};
    Object.entries(modeMap).forEach(([k, count]) => {
      let name = "Road";
      const keyLower = String(k || '').toLowerCase();
      if (keyLower.includes("air") || keyLower.includes("flight") || keyLower.includes("express") && !keyLower.includes("road")) name = "Air";
      else if (keyLower.includes("train") || keyLower.includes("rail")) name = "Train";
      else if (keyLower.includes("road") || keyLower.includes("truck") || keyLower.includes("lorry")) name = "Road";
      else name = "Road"; // Default fallback

      aggregatedModes[name] = (aggregatedModes[name] || 0) + count;
    });

    const modeDistribution = Object.entries(aggregatedModes).map(([name, value]) => ({
      name,
      value
    }));

    const salesByClient = Array.from(clientMap.values())
      .map(c => ({
        ...c,
        outstanding: Math.max(0, c.revenue - c.paid)
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.totalBookings - a.totalBookings;
      });

    const salesByVendor = Array.from(vendorMap.values())
      .map(v => ({
        ...v,
        outstanding: Math.max(0, v.revenue - v.paid)
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.totalTrips - a.totalTrips;
      });

    const bookingsList = filteredBookings.map(bk => ({
      id: bk._id || bk.id,
      awb: bk.awb || bk.consignment || bk.lrNo || bk.lrNumber || '',
      date: bk.date || bk.createdAt || '',
      clientName: bk.clientName || bk.company_name || bk.consignor || '',
      origin: bk.origin || '',
      destination: bk.destination || '',
      totalAmount: parseFloat(bk.totalAmount || bk.freight_charge || bk.total || 0) || 0,
      status: bk.billed === true || String(bk.status || '').toLowerCase() === 'billed' ? 'Billed' : (bk.status || 'Unbilled'),
      billNo: bk.billNo || ''
    }));

    const billsList = filteredBills.map(b => ({
      id: b._id || b.id,
      billNo: b.billNo || b.invoiceNo || '',
      date: b.date || b.createdAt || '',
      client: b.client || b.clientName || '',
      total: parseFloat(b.total || b.amount || 0) || 0,
      paid: parseFloat(b.paidAmount || b.paid || 0) || 0,
      balance: Math.max(0, parseFloat(b.total || 0) - parseFloat(b.paidAmount || 0) - parseFloat(b.tdsAmount || 0) - parseFloat(b.debtAmount || 0)),
      status: b.status || 'Unpaid'
    }));

    const purchasesList = filteredPurchases.map(p => ({
      id: p._id || p.id,
      billNo: p.billNo || p.invoiceNo || '',
      date: p.date || p.createdAt || '',
      vendor: p.vendor || p.vendorName || '',
      total: parseFloat(p.total || p.amount || 0) || 0,
      paid: parseFloat(p.paidAmount || p.paid || 0) || 0,
      balance: Math.max(0, parseFloat(p.total || 0) - parseFloat(p.paidAmount || 0) - parseFloat(p.tdsAmount || 0) - parseFloat(p.debtAmount || 0)),
      status: p.status || 'Unpaid'
    }));

    // Cash flow
    const cashFlowMap = {};
    (cashEntries || []).forEach(c => {
      const d = parseAnyDate(c.date || c.createdAt);
      if (fromMillis && (!d || d.getTime() < fromMillis)) return;
      if (toMillis && (!d || d.getTime() > toMillis)) return;

      const groupKey = getGroupKey(d, groupBy);
      if (!cashFlowMap[groupKey]) {
        cashFlowMap[groupKey] = { name: groupKey, In: 0, Out: 0 };
      }
      const amt = parseFloat(c.amount || 0) || 0;
      const type = String(c.type || '').toLowerCase();
      if (type === 'in' || type === 'income') {
        cashFlowMap[groupKey].In += amt;
      } else {
        cashFlowMap[groupKey].Out += amt;
      }
    });

    const cashFlowData = Object.values(cashFlowMap).sort((a, b) => a.name.localeCompare(b.name));

    const responseData = {
      financial: {
        totalRevenue,
        paidAmount,
        taxLiability,
        totalBills: filteredBills.length,
        outstandingReceivables,
        totalExpenses,
        totalExpensesPaid,
        outstandingPayables,
        profitOrLoss,
        netCashFlow
      },
      totalBookings: filteredBookings.length,
      billedBookingsCount,
      unbilledBookingsCount,
      unbilledRevenue: unbilledRevenueTotal,
      totalTrips: trips.length,
      totalClients: clients.length,
      totalVendors: vendors.length,
      financialTrendData,
      bookingsData,
      routeData,
      modeDistribution,
      salesByClient,
      salesByVendor,
      bookingsList,
      billsList,
      purchasesList,
      cashFlowData
    };


    return success(res, "Advanced Analytics fetched successfully", responseData);

  } catch (error) {
    console.error("Advanced Analytics Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
