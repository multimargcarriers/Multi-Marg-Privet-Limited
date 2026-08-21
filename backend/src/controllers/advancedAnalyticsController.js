const { db } = require("../config/database");
const { success } = require("../utils/response");

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

    // Fetch collections in parallel
    const [bills, purchases, bookings, cashEntries] = await Promise.all([
      mongoDb ? mongoDb.collection("bills").find({}).toArray() : db.collection("bills").get().then(s => { const r=[]; s.forEach(d=>r.push(d.data())); return r; }),
      mongoDb ? mongoDb.collection("purchases").find({}).toArray() : db.collection("purchases").get().then(s => { const r=[]; s.forEach(d=>r.push(d.data())); return r; }),
      mongoDb ? mongoDb.collection("bookings").find({}).toArray() : db.collection("bookings").get().then(s => { const r=[]; s.forEach(d=>r.push(d.data())); return r; }),
      mongoDb ? mongoDb.collection("cash").find({}).toArray().catch(() => mongoDb.collection("cashEntries").find({}).toArray().catch(() => [])) : []
    ]);

    // 1. Filter Bills
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

    // 2. Filter Purchases
    const filteredPurchases = purchases.filter(p => {
      const d = parseAnyDate(p.date || p.createdAt);
      if (fromMillis && (!d || d.getTime() < fromMillis)) return false;
      if (toMillis && (!d || d.getTime() > toMillis)) return false;
      return true;
    });

    // 3. Filter Bookings
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

    // 4. Financial Calculations
    let totalRevenue = 0;
    let paidAmount = 0;
    let taxLiability = 0;
    const financeTrendMap = {};
    const clientSalesMap = {};

    filteredBills.forEach(b => {
      const rev = parseFloat(b.total || b.amount || b.grand_total || 0) || 0;
      const paid = parseFloat(b.paidAmount || b.paid || 0) || 0;
      const tax = parseFloat(b.taxLiability || ((parseFloat(b.cgst || 0) + parseFloat(b.sgst || 0) + parseFloat(b.igst || 0)))) || 0;
      
      totalRevenue += rev;
      paidAmount += paid;
      taxLiability += tax;

      const d = parseAnyDate(b.date || b.createdAt);
      const groupKey = getGroupKey(d, groupBy);
      if (!financeTrendMap[groupKey]) {
        financeTrendMap[groupKey] = { name: groupKey, revenue: 0, expense: 0 };
      }
      financeTrendMap[groupKey].revenue += rev;

      const cName = b.client || b.clientName || "Unknown";
      if (!clientSalesMap[cName]) {
        clientSalesMap[cName] = { name: cName, revenue: 0, paid: 0 };
      }
      clientSalesMap[cName].revenue += rev;
      clientSalesMap[cName].paid += paid;
    });

    // Expense calculations
    let totalExpenses = 0;
    filteredPurchases.forEach(p => {
      const exp = parseFloat(p.total || p.amount || 0) || 0;
      totalExpenses += exp;

      const d = parseAnyDate(p.date || p.createdAt);
      const groupKey = getGroupKey(d, groupBy);
      if (!financeTrendMap[groupKey]) {
        financeTrendMap[groupKey] = { name: groupKey, revenue: 0, expense: 0 };
      }
      financeTrendMap[groupKey].expense += exp;
    });

    const financialTrendData = Object.values(financeTrendMap).sort((a, b) => a.name.localeCompare(b.name));

    // Bookings & Route Insights
    const bookingTrendMap = {};
    const routeMap = {};
    const modeMap = {};
    let unbilledRevenueTotal = 0;

    filteredBookings.forEach(bk => {
      const d = parseAnyDate(bk.date || bk.createdAt);
      const groupKey = getGroupKey(d, groupBy);
      if (!bookingTrendMap[groupKey]) {
        bookingTrendMap[groupKey] = { name: groupKey, trips: 0 };
      }
      bookingTrendMap[groupKey].trips += 1;

      const status = String(bk.status || '').toLowerCase();
      if (status !== 'billed') {
        const amt = parseFloat(bk.totalAmount || bk.freight_charge || bk.total || 0) || 0;
        unbilledRevenueTotal += amt;
      }

      const org = (bk.origin || bk.from || 'Unknown').toUpperCase();
      const dst = (bk.destination || bk.to || 'Unknown').toUpperCase();
      const rKey = `${org} -> ${dst}`;
      routeMap[rKey] = (routeMap[rKey] || 0) + 1;

      const mKey = String(bk.mode || 'Road').toLowerCase();
      modeMap[mKey] = (modeMap[mKey] || 0) + 1;
    });

    const bookingsData = Object.values(bookingTrendMap).sort((a, b) => a.name.localeCompare(b.name));
    const routeData = Object.entries(routeMap)
      .map(([name, trips]) => ({ name, trips }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 10);

    const modeDistribution = Object.entries(modeMap).map(([k, count]) => {
      let name = "Road";
      if (k.includes("air") || k.includes("flight")) name = "Air";
      else if (k.includes("train") || k.includes("rail")) name = "Train";
      else if (k.includes("road")) name = "Road";
      else name = k.charAt(0).toUpperCase() + k.slice(1);
      return { name, value: count };
    });

    const salesByClient = Object.values(clientSalesMap)
      .map(c => ({
        name: c.name,
        revenue: c.revenue,
        paid: c.paid,
        outstanding: c.revenue - c.paid
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

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

    return success(res, "Advanced Analytics fetched successfully", {
      financial: {
        totalRevenue,
        paidAmount,
        taxLiability,
        totalBills: filteredBills.length,
        outstandingReceivables: totalRevenue - paidAmount,
        totalExpenses
      },
      totalBookings: filteredBookings.length,
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
