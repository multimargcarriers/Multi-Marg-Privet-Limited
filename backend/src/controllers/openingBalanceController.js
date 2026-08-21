const { db } = require("../config/database");
const { success, created, error } = require("../utils/response");
const { delCache } = require("../config/redis");
const { recalculatePartyPayments, recalculateAllPayments } = require("../utils/paymentUtils");

const CACHE_KEY = "openingBalances";

// Helper to recalculate and sync opening balances with active cash sheet and adjustments
const recalculateOpeningBalances = async () => {
  try {
    await recalculateAllPayments();
    await delCache(CACHE_KEY);
  } catch (e) {
    console.error("recalculateOpeningBalances error:", e.message);
  }
};

// 1. Get Opening Balances (with auto sync)
exports.getOpeningBalances = async (req, res) => {
  try {
    const { financialYear, partyType, search, sync } = req.query;

    if (sync === "true") {
      await recalculateOpeningBalances();
    }

    let query = db.collection("openingBalances");
    const snapshot = await query.get();
    let entries = [];
    snapshot.forEach((doc) => entries.push({ id: doc.id, ...doc.data() }));

    if (financialYear && financialYear !== "All") {
      entries = entries.filter((e) => e.financialYear === financialYear);
    }
    if (partyType && partyType !== "All") {
      entries = entries.filter((e) => e.partyType === partyType);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      entries = entries.filter(
        (e) =>
          (e.partyName || "").toLowerCase().includes(q) ||
          (e.financialYear || "").toLowerCase().includes(q)
      );
    }

    entries.sort((a, b) => (b.openingOutstanding || 0) - (a.openingOutstanding || 0));

    return success(res, "Opening balances fetched successfully", entries);
  } catch (err) {
    console.error("getOpeningBalances error:", err);
    return error(res, "Failed to fetch opening balances", 500, err.message);
  }
};

// 2. Create Opening Balance Manually
exports.createOpeningBalance = async (req, res) => {
  try {
    const {
      financialYear = "2026-2027",
      asOfDate = "2026-03-31",
      effectiveFrom = "2026-04-01",
      partyType = "Client",
      partyName,
      openingOutstanding = 0,
      totalBilledPrior = 0,
      totalPaidPrior = 0,
      totalTdsPrior = 0,
      totalDebtPrior = 0,
      notes = ""
    } = req.body;

    if (!partyName || !partyName.trim()) {
      return error(res, "Party Name is required", 400);
    }

    const baseline = Number(totalBilledPrior) !== undefined && Number(totalBilledPrior) !== 0 ? Number(totalBilledPrior) : Number(openingOutstanding || 0);

    const docData = {
      financialYear,
      asOfDate,
      effectiveFrom,
      partyType,
      partyName: partyName.trim(),
      openingOutstanding: Number(openingOutstanding) || 0,
      totalBilledPrior: Number(totalBilledPrior) || 0,
      initialOpeningDue: baseline,
      totalPaidPrior: Number(totalPaidPrior) || 0,
      totalTdsPrior: Number(totalTdsPrior) || 0,
      totalDebtPrior: Number(totalDebtPrior) || 0,
      notes: notes || `Manual opening balance entry for ${financialYear}`,
      isManual: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection("openingBalances").add(docData);
    await delCache(CACHE_KEY);

    try {
      await recalculatePartyPayments(docData.partyType, docData.partyName);
    } catch (rErr) {
      console.error("Recalculate error after opening balance create:", rErr);
    }

    return created(res, "Opening balance created successfully", { id: docRef.id, ...docData });
  } catch (err) {
    console.error("createOpeningBalance error:", err);
    return error(res, "Failed to create opening balance", 500, err.message);
  }
};

// 3. Update Opening Balance
exports.updateOpeningBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("openingBalances").doc(id).get();
    if (!doc.exists) return error(res, "Opening balance not found", 404);

    const existing = doc.data();
    const billedPriorVal = req.body.totalBilledPrior !== undefined ? Number(req.body.totalBilledPrior) : Number(existing.totalBilledPrior || 0);
    const openingOutVal = req.body.openingOutstanding !== undefined ? Number(req.body.openingOutstanding) : Number(existing.openingOutstanding || 0);

    let baseline = billedPriorVal;
    if (billedPriorVal === 0 && openingOutVal === 0) {
      baseline = 0;
    } else if (billedPriorVal === 0 && openingOutVal > 0) {
      baseline = openingOutVal;
    }

    const updateData = {
      ...req.body,
      openingOutstanding: openingOutVal,
      totalBilledPrior: billedPriorVal,
      initialOpeningDue: baseline,
      totalPaidPrior: req.body.totalPaidPrior !== undefined ? Number(req.body.totalPaidPrior) : Number(existing.totalPaidPrior || 0),
      totalTdsPrior: req.body.totalTdsPrior !== undefined ? Number(req.body.totalTdsPrior) : Number(existing.totalTdsPrior || 0),
      totalDebtPrior: req.body.totalDebtPrior !== undefined ? Number(req.body.totalDebtPrior) : Number(existing.totalDebtPrior || 0),
      tdsStatus: req.body.tdsStatus !== undefined ? req.body.tdsStatus : (existing.tdsStatus || "pending"),
      updatedAt: new Date().toISOString()
    };

    await db.collection("openingBalances").doc(id).update(updateData);
    await delCache(CACHE_KEY);

    // Re-evaluate party payments with the updated prior invoice amount
    try {
      await recalculatePartyPayments(updateData.partyType || existing.partyType, updateData.partyName || existing.partyName);
    } catch (rErr) {
      console.error("Recalculate error after opening balance update:", rErr);
    }

    return success(res, "Opening balance updated successfully", { id, ...existing, ...updateData });
  } catch (err) {
    console.error("updateOpeningBalance error:", err);
    return error(res, "Failed to update opening balance", 500, err.message);
  }
};

// 4. Delete Opening Balance
exports.deleteOpeningBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("openingBalances").doc(id).get();
    if (!doc.exists) return error(res, "Opening balance not found", 404);
    const partyType = doc.data().partyType;
    const partyName = doc.data().partyName;

    await db.collection("openingBalances").doc(id).delete(req.user);
    await delCache(CACHE_KEY);

    try {
      await recalculatePartyPayments(partyType, partyName);
    } catch (rErr) {}

    return success(res, "Opening balance deleted successfully");
  } catch (err) {
    console.error("deleteOpeningBalance error:", err);
    return error(res, "Failed to delete opening balance", 500, err.message);
  }
};

// Global Recalculate All Opening Balances Endpoint
exports.recalculateAllOpeningBalances = async (req, res) => {
  try {
    const result = await recalculateAllPayments();
    await delCache(CACHE_KEY);
    return success(res, "All opening balances, client & vendor payments, and bills recalculated successfully", result);
  } catch (err) {
    console.error("recalculateAllOpeningBalances error:", err);
    return error(res, "Failed to recalculate opening balances: " + err.message, 500);
  }
};

// 5. Year-End Financial Year Close & Archival Workflow
exports.closeFinancialYear = async (req, res) => {
  try {
    const {
      cutoffDate = "2026-03-31",
      targetFY = "2026-2027",
      effectiveDate = "2026-04-01",
      notes = ""
    } = req.body;

    const cutoffISO = new Date(cutoffDate + "T23:59:59.999Z");

    const isPriorOrEqual = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d <= cutoffISO;
    };

    // A. FETCH ALL HISTORICAL DATA UP TO CUTOFF
    const [clientsSnap, vendorsSnap, billsSnap, purchasesSnap, cashSnap, outSnap, bookingsSnap] =
      await Promise.all([
        db.collection("clients").get(),
        db.collection("vendors").get(),
        db.collection("bills").get(),
        db.collection("purchases").get(),
        db.collection("cashEntries").get(),
        db.collection("outstanding").get(),
        db.collection("bookings").get()
      ]);

    const clients = [];
    clientsSnap.forEach((d) => clients.push({ id: d.id, ...d.data() }));

    const vendors = [];
    vendorsSnap.forEach((d) => vendors.push({ id: d.id, ...d.data() }));

    const bills = [];
    billsSnap.forEach((d) => bills.push({ id: d.id, ...d.data() }));

    const purchases = [];
    purchasesSnap.forEach((d) => purchases.push({ id: d.id, ...d.data() }));

    const cashEntries = [];
    cashSnap.forEach((d) => cashEntries.push({ id: d.id, ...d.data() }));

    const adjustments = [];
    outSnap.forEach((d) => adjustments.push({ id: d.id, ...d.data() }));

    const bookings = [];
    bookingsSnap.forEach((d) => bookings.push({ id: d.id, ...d.data() }));

    // B. COMPUTE PRIOR FY OPENING BALANCES FOR CLIENTS
    const clientOpeningList = [];
    for (const client of clients) {
      const cName = client.name || "";
      const cNorm = cName.toLowerCase().trim();

      const priorBills = bills.filter(
        (b) =>
          isPriorOrEqual(b.date || b.createdAt) &&
          (b.client || b.billedTo || "").toLowerCase().trim() === cNorm
      );
      const totalBilledPrior = priorBills.reduce(
        (sum, b) => sum + (Number(b.total || b.amount) || 0),
        0
      );

      const priorCash = cashEntries.filter(
        (c) =>
          isPriorOrEqual(c.date || c.createdAt) &&
          c.partyType === "Client" &&
          (c.partyName || "").toLowerCase().trim() === cNorm
      );
      let totalPaidPrior = 0;
      priorCash.forEach((c) => {
        const amt = Number(c.amount) || 0;
        if (c.type === "in") totalPaidPrior += amt;
        else if (c.type === "out") totalPaidPrior -= amt;
      });

      const priorAdj = adjustments.filter(
        (a) =>
          isPriorOrEqual(a.date || a.createdAt) &&
          (a.partyType !== "Vendor" && !a.vendor) &&
          (a.client || "").toLowerCase().trim() === cNorm
      );
      const totalTdsPrior = priorAdj
        .filter((a) => a.particulars === "tds")
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const totalDebtPrior = priorAdj
        .filter((a) => a.particulars === "debit" || a.particulars === "debt")
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      const netOutstanding = totalBilledPrior - totalPaidPrior - totalTdsPrior - totalDebtPrior;

      if (Math.abs(netOutstanding) > 0.01 || totalBilledPrior > 0) {
        clientOpeningList.push({
          financialYear: targetFY,
          asOfDate: cutoffDate,
          effectiveFrom: effectiveDate,
          partyType: "Client",
          partyName: cName,
          openingOutstanding: Number(netOutstanding.toFixed(2)),
          totalBilledPrior: Number(totalBilledPrior.toFixed(2)),
          totalPaidPrior: Number(totalPaidPrior.toFixed(2)),
          totalTdsPrior: Number(totalTdsPrior.toFixed(2)),
          totalDebtPrior: Number(totalDebtPrior.toFixed(2)),
          notes: notes || `Carried forward from FY ending ${cutoffDate}`,
          isManual: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // C. COMPUTE PRIOR FY OPENING BALANCES FOR VENDORS
    const vendorOpeningList = [];
    for (const vendor of vendors) {
      const vName = vendor.name || "";
      const vNorm = vName.toLowerCase().trim();

      const priorPurchases = purchases.filter(
        (p) =>
          isPriorOrEqual(p.date || p.createdAt) &&
          (p.vendor || "").toLowerCase().trim() === vNorm
      );
      const totalBilledPrior = priorPurchases.reduce(
        (sum, p) => sum + (Number(p.total || p.amount) || 0),
        0
      );

      const priorCash = cashEntries.filter(
        (c) =>
          isPriorOrEqual(c.date || c.createdAt) &&
          c.partyType === "Vendor" &&
          (c.partyName || "").toLowerCase().trim() === vNorm
      );
      let totalPaidPrior = 0;
      priorCash.forEach((c) => {
        const amt = Number(c.amount) || 0;
        if (c.type === "out") totalPaidPrior += amt;
        else if (c.type === "in") totalPaidPrior -= amt;
      });

      const priorAdj = adjustments.filter(
        (a) =>
          isPriorOrEqual(a.date || a.createdAt) &&
          (a.partyType === "Vendor" || !!a.vendor) &&
          (a.client || a.vendor || "").toLowerCase().trim() === vNorm
      );
      const totalTdsPrior = priorAdj
        .filter((a) => a.particulars === "tds")
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const totalDebtPrior = priorAdj
        .filter((a) => a.particulars === "debit" || a.particulars === "debt")
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      const netOutstanding = totalBilledPrior - totalPaidPrior - totalTdsPrior - totalDebtPrior;

      if (Math.abs(netOutstanding) > 0.01 || totalBilledPrior > 0) {
        vendorOpeningList.push({
          financialYear: targetFY,
          asOfDate: cutoffDate,
          effectiveFrom: effectiveDate,
          partyType: "Vendor",
          partyName: vName,
          openingOutstanding: Number(netOutstanding.toFixed(2)),
          totalBilledPrior: Number(totalBilledPrior.toFixed(2)),
          totalPaidPrior: Number(totalPaidPrior.toFixed(2)),
          totalTdsPrior: Number(totalTdsPrior.toFixed(2)),
          totalDebtPrior: Number(totalDebtPrior.toFixed(2)),
          notes: notes || `Carried forward from FY ending ${cutoffDate}`,
          isManual: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // D. SAVE OPENING BALANCES IN DATABASE
    const allOpening = [...clientOpeningList, ...vendorOpeningList];
    for (const record of allOpening) {
      const existing = await db
        .collection("openingBalances")
        .where("financialYear", "==", targetFY)
        .where("partyType", "==", record.partyType)
        .where("partyName", "==", record.partyName)
        .get();

      if (!existing.empty) {
        const docId = existing.docs[0].id;
        await db.collection("openingBalances").doc(docId).update(record);
      } else {
        await db.collection("openingBalances").add(record);
      }
    }

    // E. PURGE PRIOR COMPLETED BILLS
    let billsDeleted = 0;
    for (const bill of bills) {
      if (isPriorOrEqual(bill.date || bill.createdAt)) {
        await db.collection("bills").doc(bill.id).delete(req.user);
        billsDeleted++;
      }
    }

    // F. PURGE PRIOR PURCHASE BILLS
    let purchasesDeleted = 0;
    for (const purchase of purchases) {
      if (isPriorOrEqual(purchase.date || purchase.createdAt)) {
        await db.collection("purchases").doc(purchase.id).delete(req.user);
        purchasesDeleted++;
      }
    }

    // G. PURGE PRIOR COMPLETED AWBS (KEEP UNBILLED / PENDING AWBs INTACT!)
    let awbsDeleted = 0;
    let awbsRetainedUnbilled = 0;
    
    // Create set of all prior bill numbers that were purged
    const purgedBillNumbers = new Set(
      bills.filter(b => isPriorOrEqual(b.date || b.createdAt)).map(b => String(b.invoice || b.billNo || '').trim().toLowerCase())
    );

    for (const booking of bookings) {
      if (isPriorOrEqual(booking.date || booking.createdAt)) {
        const bNo = String(booking.billNo || booking.bill_no || booking.invoiceNo || '').trim().toLowerCase();
        const isBilled =
          booking.billed === true ||
          String(booking.status || "").toLowerCase() === "billed" ||
          (bNo !== "" && purgedBillNumbers.has(bNo));

        if (isBilled) {
          // Completed/billed AWB from prior year: purge to clean up
          await db.collection("bookings").doc(booking.id).delete(req.user);
          awbsDeleted++;
        } else {
          // UNBILLED or PENDING AWB: STRICTLY PRESERVE FOR NEW YEAR BILLING!
          awbsRetainedUnbilled++;
        }
      }
    }

    // H. PURGE PRIOR CASH SHEET ENTRIES (ROLLED INTO OPENING BALANCE)
    let cashEntriesDeleted = 0;
    for (const cash of cashEntries) {
      if (isPriorOrEqual(cash.date || cash.createdAt)) {
        await db.collection("cashEntries").doc(cash.id).delete(req.user);
        cashEntriesDeleted++;
      }
    }

    // I. PURGE PRIOR TDS & DEBT ADJUSTMENTS (ROLLED INTO OPENING BALANCE)
    let adjustmentsDeleted = 0;
    for (const adj of adjustments) {
      if (isPriorOrEqual(adj.date || adj.createdAt)) {
        await db.collection("outstanding").doc(adj.id).delete(req.user);
        adjustmentsDeleted++;
      }
    }

    // J. CLEAR ALL RELEVANT REDIS CACHES
    await Promise.all([
      delCache(CACHE_KEY),
      delCache("bills"),
      delCache("purchases"),
      delCache("bookings"),
      delCache("outstanding"),
      delCache("cashEntries")
    ]);

    return success(res, `Financial Year Close for ${cutoffDate} completed successfully`, {
      targetFY,
      cutoffDate,
      effectiveDate,
      clientsCarriedForward: clientOpeningList.length,
      vendorsCarriedForward: vendorOpeningList.length,
      billsDeleted,
      purchasesDeleted,
      awbsDeleted,
      awbsRetainedUnbilled,
      cashEntriesDeleted,
      adjustmentsDeleted
    });
  } catch (err) {
    console.error("closeFinancialYear error:", err);
    return error(res, "Financial Year close failed", 500, err.message);
  }
};
