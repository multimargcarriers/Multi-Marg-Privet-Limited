const { db } = require("../config/database");
const { delCache } = require("../config/redis");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

let analyticsTimeout = null;
const debouncedAnalyticsAggregation = () => {
    if (analyticsTimeout) clearTimeout(analyticsTimeout);
    analyticsTimeout = setTimeout(() => {
        runAnalyticsAggregation().catch(e => console.error("Debounced analytics sync failed", e));
    }, 1500);
};

const recalculatePartyPayments = async (partyType, partyName, skipAnalytics = false) => {
    if (!partyName) return;

    let normType = String(partyType || '').trim().toLowerCase();
    const cleanPartyName = String(partyName || '').trim();
    const escapedPartyName = escapeRegExp(cleanPartyName);
    const flexiblePattern = escapedPartyName
        .replace(/\\s\+|\\s\*/g, '\\s*')
        .replace(/[-_\\/,\.]+/g, '[-\\s_\\/,\\.]*')
        .replace(/\s+/g, '\\s*');
    const regex = new RegExp(`^\\s*${flexiblePattern}\\s*$`, "i");

    if (normType !== 'client' && normType !== 'vendor') {
        const isClient = await db.mongoDb.collection("clients").findOne({ name: { $regex: regex } }) || await db.mongoDb.collection("bills").findOne({ client: { $regex: regex } });
        if (isClient) {
            normType = 'client';
        } else {
            const isVendor = await db.mongoDb.collection("vendors").findOne({ name: { $regex: regex } }) || await db.mongoDb.collection("purchases").findOne({ vendor: { $regex: regex } });
            if (isVendor) normType = 'vendor';
            else normType = 'client'; // default to client
        }
    }

    if (normType === 'client') {
        // A. Fetch All Cash Entries for Client
        const cashDocs = await db.mongoDb.collection("cashEntries").find({
            $and: [
                { partyName: { $regex: regex } },
                { $or: [{ partyType: { $regex: /^client$/i } }, { partyType: { $exists: false } }, { partyType: "" }, { partyType: null }] }
            ]
        }).toArray();

        const billSpecificCashMap = {};
        let generalCashPaid = 0;

        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            const netAmt = (doc.type === "in") ? amt : -amt;
            let bNo = String(doc.billNo || '').trim().toLowerCase();
            if (!bNo || bNo === 'none' || bNo === 'general' || bNo === 'undefined' || bNo === 'null') {
                const match = String(doc.remarks || '').match(/mcpl\/[0-9]{2}-[0-9]{2}\/[0-9]{4}/i) || String(doc.remarks || '').match(/bill\s*no\.?\s*:?\s*([^\s,;]+)/i);
                if (match) {
                    bNo = match[0].toLowerCase();
                }
            }
            if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                billSpecificCashMap[bNo] = (billSpecificCashMap[bNo] || 0) + netAmt;
            } else {
                generalCashPaid += netAmt;
            }
        });

        // B. Fetch All TDS & Debt Adjustments for Client from 'outstanding' collection
        const adjDocs = await db.mongoDb.collection("outstanding").find({
            $and: [
                { $or: [{ client: { $regex: regex } }, { partyName: { $regex: regex } }] },
                { $or: [{ partyType: { $not: { $regex: /^vendor$/i } } }, { partyType: { $exists: false } }, { partyType: "" }, { partyType: null }] },
                { $or: [{ vendor: { $exists: false } }, { vendor: "" }, { vendor: null }] }
            ]
        }).toArray();

        const billSpecificTdsMap = {};
        const billSpecificDebtMap = {};
        let generalTds = 0;
        let generalDebt = 0;

        adjDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            let bNo = String(doc.billNo || doc.linkedBillNo || '').trim().toLowerCase();
            if (!bNo || bNo === 'none' || bNo === 'general' || bNo === 'undefined' || bNo === 'null') {
                const match = String(doc.remarks || '').match(/mcpl\/[0-9]{2}-[0-9]{2}\/[0-9]{4}/i);
                if (match) bNo = match[0].toLowerCase();
            }
            const part = String(doc.particulars || 'tds').trim().toLowerCase();

            if (part === 'tds') {
                if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                    billSpecificTdsMap[bNo] = (billSpecificTdsMap[bNo] || 0) + amt;
                } else {
                    generalTds += amt;
                }
            } else if (part === 'debit' || part === 'debt') {
                if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                    billSpecificDebtMap[bNo] = (billSpecificDebtMap[bNo] || 0) + amt;
                } else {
                    generalDebt += amt;
                }
            }
        });

        // C. Settle Prior Opening Outstanding FIRST with General Payments and General TDS/Debt
        const openDoc = await db.mongoDb.collection("openingBalances").findOne({
            partyType: { $regex: /^client$/i },
            partyName: { $regex: regex }
        });

        let remainingGeneralCash = generalCashPaid;
        let remainingGeneralTds = generalTds;
        let remainingGeneralDebt = generalDebt;

        if (openDoc) {
            let initialBaseline = 0;
            if (openDoc.initialOpeningDue !== undefined && Number(openDoc.initialOpeningDue) > 0) {
                initialBaseline = Number(openDoc.initialOpeningDue);
            } else if (openDoc.totalBilledPrior !== undefined && Number(openDoc.totalBilledPrior) > 0) {
                initialBaseline = Number(openDoc.totalBilledPrior);
            } else if (openDoc.openingOutstanding !== undefined && Number(openDoc.openingOutstanding) > 0) {
                initialBaseline = Number(openDoc.openingOutstanding);
            } else {
                initialBaseline = 0;
            }

            const priorStaticTds = Number(openDoc.totalTdsPrior) || 0;
            const priorStaticDebt = Number(openDoc.totalDebtPrior) || 0;

            let maxPayable = Math.max(0, initialBaseline - priorStaticTds - priorStaticDebt);

            // 1. Absorb general TDS into opening balance if opening due exists
            let openTdsDeducted = 0;
            if (remainingGeneralTds > 0 && maxPayable > 0) {
                openTdsDeducted = Math.min(maxPayable, remainingGeneralTds);
                maxPayable -= openTdsDeducted;
                remainingGeneralTds -= openTdsDeducted;
            }

            // 2. Absorb general Debt into opening balance if opening due exists
            let openDebtDeducted = 0;
            if (remainingGeneralDebt > 0 && maxPayable > 0) {
                openDebtDeducted = Math.min(maxPayable, remainingGeneralDebt);
                maxPayable -= openDebtDeducted;
                remainingGeneralDebt -= openDebtDeducted;
            }

            // 3. Absorb general Cash into opening balance
            let openingPaid = 0;
            if (remainingGeneralCash > 0 && maxPayable > 0) {
                openingPaid = Math.min(maxPayable, remainingGeneralCash);
                maxPayable -= openingPaid;
                remainingGeneralCash -= openingPaid;
            }

            const newOpeningDue = Number(Math.max(0, maxPayable).toFixed(2));
            const totalTdsPriorCombined = Number((priorStaticTds + openTdsDeducted).toFixed(2));
            const totalDebtPriorCombined = Number((priorStaticDebt + openDebtDeducted).toFixed(2));
            const totalPaidPriorUpdated = Number(openingPaid.toFixed(2));

            await db.collection("openingBalances").doc(openDoc.id || openDoc._id.toString()).update({
                initialOpeningDue: openDoc.initialOpeningDue || initialBaseline,
                totalBilledPrior: initialBaseline,
                totalPaidPrior: totalPaidPriorUpdated,
                totalTdsPrior: totalTdsPriorCombined,
                totalDebtPrior: totalDebtPriorCombined,
                openingOutstanding: newOpeningDue,
                updatedAt: new Date().toISOString()
            });
        }

        // D. Cascade Direct Payments & Remaining General Payments/TDS/Debt to Bills
        const billsDocs = await db.mongoDb.collection("bills").find({
            client: { $regex: regex }
        }).toArray();
        
        billsDocs.sort((a, b) => {
            const parseDate = (d) => {
                if (!d) return 9999999999999;
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? 9999999999999 : dt.getTime();
            };
            const timeA = parseDate(a.billDate || a.date || a.invoice_date || a.createdAt);
            const timeB = parseDate(b.billDate || b.date || b.invoice_date || b.createdAt);
            if (timeA !== timeB) {
                return timeA - timeB; // Oldest dates first (Strict FIFO)
            }
            return String(a.invoice || a.billNo || '').localeCompare(String(b.invoice || b.billNo || ''));
        });

        for (const bill of billsDocs) {
            const billTotal = Number(bill.total || bill.amount) || 0;
            const bNo = String(bill.invoice || bill.billNo || '').trim().toLowerCase();
            
            const directCash = billSpecificCashMap[bNo] || 0;
            const directTds = billSpecificTdsMap[bNo] || 0;
            const directDebt = billSpecificDebtMap[bNo] || 0;

            let billCash = directCash;
            let billTds = directTds;
            let billDebt = directDebt;

            let settledSoFar = billCash + billTds + billDebt;
            let unapplied = Math.max(0, billTotal - settledSoFar);

            // Allocate Remaining General TDS
            if (remainingGeneralTds > 0 && unapplied > 0) {
                const genTds = Math.min(unapplied, remainingGeneralTds);
                billTds += genTds;
                remainingGeneralTds -= genTds;
                settledSoFar += genTds;
                unapplied = Math.max(0, billTotal - settledSoFar);
            }

            // Allocate Remaining General Debt
            if (remainingGeneralDebt > 0 && unapplied > 0) {
                const genDebt = Math.min(unapplied, remainingGeneralDebt);
                billDebt += genDebt;
                remainingGeneralDebt -= genDebt;
                settledSoFar += genDebt;
                unapplied = Math.max(0, billTotal - settledSoFar);
            }

            // Allocate Remaining General Cash
            if (remainingGeneralCash > 0 && unapplied > 0) {
                const genCash = Math.min(unapplied, remainingGeneralCash);
                billCash += genCash;
                remainingGeneralCash -= genCash;
                settledSoFar += genCash;
                unapplied = Math.max(0, billTotal - settledSoFar);
            }

            const isCancelled = String(bill.status || '').toLowerCase() === 'cancelled';
            let newStatus = "Unpaid";
            if (isCancelled) {
                newStatus = "Cancelled";
            } else if (unapplied <= 0.01) {
                newStatus = "Paid";
            } else if (settledSoFar > 0.01) {
                newStatus = "Partial";
            }

            const updatedCash = Number(billCash.toFixed(2));
            const updatedTds = Number(billTds.toFixed(2));
            const updatedDebt = Number(billDebt.toFixed(2));

            if (bill.paidAmount !== updatedCash || bill.tdsAmount !== updatedTds || bill.debtAmount !== updatedDebt || bill.status !== newStatus) {
                await db.collection("bills").doc(bill.id || bill._id.toString()).update({
                    paidAmount: updatedCash,
                    tdsAmount: updatedTds,
                    debtAmount: updatedDebt,
                    status: newStatus
                });
            }
        }
    }
    else if (normType === 'vendor') {
        // A. Fetch All Cash Entries for Vendor
        const cashDocs = await db.mongoDb.collection("cashEntries").find({
            $and: [
                { partyName: { $regex: regex } },
                { partyType: { $regex: /^vendor$/i } }
            ]
        }).toArray();

        const purchaseSpecificCashMap = {};
        let generalCashPaid = 0;

        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            const netAmt = (doc.type === "out") ? amt : -amt;
            let bNo = String(doc.billNo || '').trim().toLowerCase();
            if (!bNo || bNo === 'none' || bNo === 'general' || bNo === 'undefined' || bNo === 'null') {
                const match = String(doc.remarks || '').match(/mcpl\/[0-9]{2}-[0-9]{2}\/[0-9]{4}/i) || String(doc.remarks || '').match(/bill\s*no\.?\s*:?\s*([^\s,;]+)/i);
                if (match) {
                    bNo = match[0].toLowerCase();
                }
            }
            if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                purchaseSpecificCashMap[bNo] = (purchaseSpecificCashMap[bNo] || 0) + netAmt;
            } else {
                generalCashPaid += netAmt;
            }
        });

        // B. Fetch All TDS & Deductions for Vendor from 'outstanding' collection
        const adjDocs = await db.mongoDb.collection("outstanding").find({
            $and: [
                { $or: [{ vendor: { $regex: regex } }, { client: { $regex: regex } }, { partyName: { $regex: regex } }] },
                { $or: [{ partyType: { $regex: /^vendor$/i } }, { vendor: { $exists: true, $ne: "" } }] }
            ]
        }).toArray();

        const purchaseSpecificTdsMap = {};
        const purchaseSpecificDebtMap = {};
        let generalTds = 0;
        let generalDebt = 0;

        adjDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            let bNo = String(doc.billNo || doc.linkedBillNo || '').trim().toLowerCase();
            if (!bNo || bNo === 'none' || bNo === 'general' || bNo === 'undefined' || bNo === 'null') {
                const match = String(doc.remarks || '').match(/mcpl\/[0-9]{2}-[0-9]{2}\/[0-9]{4}/i);
                if (match) bNo = match[0].toLowerCase();
            }
            const part = String(doc.particulars || 'tds').trim().toLowerCase();

            if (part === 'tds') {
                if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                    purchaseSpecificTdsMap[bNo] = (purchaseSpecificTdsMap[bNo] || 0) + amt;
                } else {
                    generalTds += amt;
                }
            } else if (part === 'debit' || part === 'debt') {
                if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                    purchaseSpecificDebtMap[bNo] = (purchaseSpecificDebtMap[bNo] || 0) + amt;
                } else {
                    generalDebt += amt;
                }
            }
        });

        // C. Settle Prior Opening Outstanding FIRST with General Payments
        const openDoc = await db.mongoDb.collection("openingBalances").findOne({
            partyType: { $regex: /^vendor$/i },
            partyName: { $regex: regex }
        });

        let remainingGeneralCash = generalCashPaid;
        let remainingGeneralTds = generalTds;
        let remainingGeneralDebt = generalDebt;

        if (openDoc) {
            let initialBaseline = 0;
            if (openDoc.initialOpeningDue !== undefined && Number(openDoc.initialOpeningDue) > 0) {
                initialBaseline = Number(openDoc.initialOpeningDue);
            } else if (openDoc.totalBilledPrior !== undefined && Number(openDoc.totalBilledPrior) > 0) {
                initialBaseline = Number(openDoc.totalBilledPrior);
            } else if (openDoc.openingOutstanding !== undefined && Number(openDoc.openingOutstanding) > 0) {
                initialBaseline = Number(openDoc.openingOutstanding);
            } else {
                initialBaseline = 0;
            }

            const priorStaticTds = Number(openDoc.totalTdsPrior) || 0;
            const priorStaticDebt = Number(openDoc.totalDebtPrior) || 0;

            let maxPayable = Math.max(0, initialBaseline - priorStaticTds - priorStaticDebt);

            // 1. Absorb general TDS
            let openTdsDeducted = 0;
            if (remainingGeneralTds > 0 && maxPayable > 0) {
                openTdsDeducted = Math.min(maxPayable, remainingGeneralTds);
                maxPayable -= openTdsDeducted;
                remainingGeneralTds -= openTdsDeducted;
            }

            // 2. Absorb general Debt
            let openDebtDeducted = 0;
            if (remainingGeneralDebt > 0 && maxPayable > 0) {
                openDebtDeducted = Math.min(maxPayable, remainingGeneralDebt);
                maxPayable -= openDebtDeducted;
                remainingGeneralDebt -= openDebtDeducted;
            }

            // 3. Absorb general Cash
            let openingPaid = 0;
            if (remainingGeneralCash > 0 && maxPayable > 0) {
                openingPaid = Math.min(maxPayable, remainingGeneralCash);
                maxPayable -= openingPaid;
                remainingGeneralCash -= openingPaid;
            }

            const newOpeningDue = Number(Math.max(0, maxPayable).toFixed(2));
            const totalTdsPriorCombined = Number((priorStaticTds + openTdsDeducted).toFixed(2));
            const totalDebtPriorCombined = Number((priorStaticDebt + openDebtDeducted).toFixed(2));
            const totalPaidPriorUpdated = Number(openingPaid.toFixed(2));

            await db.collection("openingBalances").doc(openDoc.id || openDoc._id.toString()).update({
                initialOpeningDue: openDoc.initialOpeningDue || initialBaseline,
                totalBilledPrior: initialBaseline,
                totalPaidPrior: totalPaidPriorUpdated,
                totalTdsPrior: totalTdsPriorCombined,
                totalDebtPrior: totalDebtPriorCombined,
                openingOutstanding: newOpeningDue,
                updatedAt: new Date().toISOString()
            });
        }

        // D. Cascade Remaining General Payments + Direct Payments to Purchases
        const purchasesDocs = await db.mongoDb.collection("purchases").find({
            vendor: { $regex: regex }
        }).toArray();
        
        purchasesDocs.sort((a, b) => {
            const parseDate = (d) => {
                if (!d) return 9999999999999;
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? 9999999999999 : dt.getTime();
            };
            const timeA = parseDate(a.date || a.createdAt);
            const timeB = parseDate(b.date || b.createdAt);
            if (timeA !== timeB) {
                return timeA - timeB; // Oldest dates first (Strict FIFO)
            }
            return String(a.billNo || a.id || '').localeCompare(String(b.billNo || b.id || ''));
        });

        for (const purchase of purchasesDocs) {
            const purchaseTotal = Number(purchase.total || purchase.amount) || 0;
            const bNo = String(purchase.billNo || '').trim().toLowerCase();
            
            const directCash = purchaseSpecificCashMap[bNo] || 0;
            const directTds = purchaseSpecificTdsMap[bNo] || 0;
            const directDebt = purchaseSpecificDebtMap[bNo] || 0;

            let purchaseCash = directCash;
            let purchaseTds = directTds;
            let purchaseDebt = directDebt;

            let settledSoFar = purchaseCash + purchaseTds + purchaseDebt;
            let unapplied = Math.max(0, purchaseTotal - settledSoFar);

            // Allocate Remaining General TDS
            if (remainingGeneralTds > 0 && unapplied > 0) {
                const genTds = Math.min(unapplied, remainingGeneralTds);
                purchaseTds += genTds;
                remainingGeneralTds -= genTds;
                settledSoFar += genTds;
                unapplied = Math.max(0, purchaseTotal - settledSoFar);
            }

            // Allocate Remaining General Debt
            if (remainingGeneralDebt > 0 && unapplied > 0) {
                const genDebt = Math.min(unapplied, remainingGeneralDebt);
                purchaseDebt += genDebt;
                remainingGeneralDebt -= genDebt;
                settledSoFar += genDebt;
                unapplied = Math.max(0, purchaseTotal - settledSoFar);
            }

            // Allocate Remaining General Cash
            if (remainingGeneralCash > 0 && unapplied > 0) {
                const genCash = Math.min(unapplied, remainingGeneralCash);
                purchaseCash += genCash;
                remainingGeneralCash -= genCash;
                settledSoFar += genCash;
                unapplied = Math.max(0, purchaseTotal - settledSoFar);
            }

            const newStatus = unapplied <= 0.01 ? "Paid" : (settledSoFar > 0.01 ? "Partial" : "Unpaid");
            const updatedCash = Number(purchaseCash.toFixed(2));
            const updatedTds = Number(purchaseTds.toFixed(2));
            const updatedDebt = Number(purchaseDebt.toFixed(2));

            if (purchase.paidAmount !== updatedCash || purchase.tdsAmount !== updatedTds || purchase.debtAmount !== updatedDebt || purchase.status !== newStatus) {
                await db.collection("purchases").doc(purchase.id || purchase._id.toString()).update({
                    paidAmount: updatedCash,
                    tdsAmount: updatedTds,
                    debtAmount: updatedDebt,
                    status: newStatus
                });
            }
        }
    }
    
    // Invalidate all related dependent caches
    await Promise.all([
        delCache("bills"),
        delCache("purchases"),
        delCache("outstanding"),
        delCache("cashEntries"),
        delCache("openingBalances"),
        delCache("clients"),
        delCache("vendors")
    ]);

    try {
        const { emitDataUpdated } = require("./socket");
        emitDataUpdated("bills");
        emitDataUpdated("purchases");
        emitDataUpdated("outstanding");
        emitDataUpdated("cashEntries");
        emitDataUpdated("openingBalances");
    } catch (err) {}

    if (!skipAnalytics) {
        debouncedAnalyticsAggregation();
    }
};

/**
 * Global Batch Recalculation across ALL Clients and ALL Vendors
 */
const recalculateAllPayments = async () => {
    try {
        const [clientsSnap, vendorsSnap, billsSnap, purchasesSnap, cashSnap, outSnap, openSnap] = await Promise.all([
            db.collection("clients").get(),
            db.collection("vendors").get(),
            db.collection("bills").get(),
            db.collection("purchases").get(),
            db.collection("cashEntries").get(),
            db.collection("outstanding").get(),
            db.collection("openingBalances").get()
        ]);

        const uniqueClients = new Set();
        const uniqueVendors = new Set();

        clientsSnap.forEach(d => { const n = d.data().name; if (n) uniqueClients.add(n.trim()); });
        billsSnap.forEach(d => { const n = d.data().client || d.data().billedTo; if (n) uniqueClients.add(n.trim()); });
        openSnap.forEach(d => { 
            const dData = d.data();
            if ((dData.partyType || 'Client').toLowerCase() === 'client' && dData.partyName) uniqueClients.add(dData.partyName.trim());
            if ((dData.partyType || '').toLowerCase() === 'vendor' && dData.partyName) uniqueVendors.add(dData.partyName.trim());
        });
        cashSnap.forEach(d => {
            const dData = d.data();
            if ((dData.partyType || '').toLowerCase() === 'vendor' && dData.partyName) uniqueVendors.add(dData.partyName.trim());
            else if (dData.partyName) uniqueClients.add(dData.partyName.trim());
        });
        outSnap.forEach(d => {
            const dData = d.data();
            if ((dData.partyType || '').toLowerCase() === 'vendor' || dData.vendor) {
                const n = dData.vendor || dData.client || dData.partyName;
                if (n) uniqueVendors.add(n.trim());
            } else {
                const n = dData.client || dData.partyName;
                if (n) uniqueClients.add(n.trim());
            }
        });
        vendorsSnap.forEach(d => { const n = d.data().name; if (n) uniqueVendors.add(n.trim()); });
        purchasesSnap.forEach(d => { const n = d.data().vendor; if (n) uniqueVendors.add(n.trim()); });

        const clientArray = Array.from(uniqueClients);
        const chunkSize = 15;
        for (let i = 0; i < clientArray.length; i += chunkSize) {
            const chunk = clientArray.slice(i, i + chunkSize);
            await Promise.all(chunk.map(cName => recalculatePartyPayments("Client", cName, true)));
        }

        const vendorArray = Array.from(uniqueVendors);
        for (let i = 0; i < vendorArray.length; i += chunkSize) {
            const chunk = vendorArray.slice(i, i + chunkSize);
            await Promise.all(chunk.map(vName => recalculatePartyPayments("Vendor", vName, true)));
        }

        debouncedAnalyticsAggregation();

        return {
            clientsProcessed: uniqueClients.size,
            vendorsProcessed: uniqueVendors.size
        };
    } catch (err) {
        console.error("recalculateAllPayments error:", err);
        throw err;
    }
};

module.exports = { recalculatePartyPayments, recalculateAllPayments };
