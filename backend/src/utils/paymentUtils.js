const { db } = require("../config/database");
const { delCache } = require("../config/redis");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const recalculatePartyPayments = async (partyType, partyName) => {
    if (!partyType || !partyName) return;

    const escapedPartyName = escapeRegExp(partyName);
    const regex = new RegExp(`^${escapedPartyName}$`, "i");

    if (partyType === 'Client') {
        const cashDocs = await db.mongoDb.collection("cashEntries").find({
            partyType: "Client",
            partyName: { $regex: regex }
        }).toArray();

        // Separate Direct Bill-Tagged Payments vs General Payments
        const billSpecificMap = {};
        let generalPaid = 0;

        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            const netAmt = (doc.type === "in") ? amt : -amt;
            const bNo = String(doc.billNo || '').trim().toLowerCase();
            if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                billSpecificMap[bNo] = (billSpecificMap[bNo] || 0) + netAmt;
            } else {
                generalPaid += netAmt;
            }
        });

        // 1. Clear Prior Opening Outstanding FIRST with General Payments
        const openDoc = await db.mongoDb.collection("openingBalances").findOne({
            partyType: "Client",
            partyName: { $regex: regex }
        });

        let remainingGeneral = generalPaid;
        let openingPaid = 0;

        if (openDoc) {
            const openBilled = Number(openDoc.totalBilledPrior || openDoc.openingOutstanding) || 0;
            const openTds = Number(openDoc.totalTdsPrior) || 0;
            const openDebt = Number(openDoc.totalDebtPrior) || 0;
            const maxPayable = Math.max(0, openBilled - openTds - openDebt);

            openingPaid = remainingGeneral > 0 ? Math.min(maxPayable, remainingGeneral) : 0;
            remainingGeneral -= openingPaid;

            const newOpeningDue = Number((openBilled - openingPaid - openTds - openDebt).toFixed(2));
            await db.collection("openingBalances").doc(openDoc.id || openDoc._id.toString()).update({
                totalPaidPrior: Number(openingPaid.toFixed(2)),
                openingOutstanding: newOpeningDue,
                updatedAt: new Date().toISOString()
            });
        }

        // 2. Cascade Remaining General Payments + Direct Payments to Bills
        const billsDocs = await db.mongoDb.collection("bills").find({
            client: { $regex: regex }
        }).toArray();
        
        billsDocs.sort((a, b) => {
            const parseBill = (bill) => {
                const billNo = bill.billNo || bill.invoice || "";
                const parts = billNo.split('/');
                if (parts.length >= 3) {
                    const yearPart = parts[1];
                    const seqPart = parts[2];
                    let yearStart = 0;
                    if (yearPart.includes('-')) {
                        const yearStr = yearPart.split('-')[0];
                        yearStart = parseInt(yearStr, 10) || 0;
                        if (yearStart < 100) yearStart += 2000;
                    } else {
                        yearStart = parseInt(yearPart, 10) || 0;
                    }
                    const sequence = parseInt(seqPart, 10) || 0;
                    return { hasFormat: true, yearStart, sequence };
                }
                const dateVal = new Date(bill.createdAt || bill.date || 0);
                const yearVal = dateVal.getFullYear() || 9999;
                return { hasFormat: false, yearStart: yearVal, sequence: 0 };
            };

            const infoA = parseBill(a);
            const infoB = parseBill(b);

            if (infoA.yearStart !== infoB.yearStart) {
                return infoA.yearStart - infoB.yearStart;
            }
            if (infoA.hasFormat && infoB.hasFormat) {
                if (infoA.sequence !== infoB.sequence) {
                    return infoA.sequence - infoB.sequence;
                }
            }
            return new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0);
        });

        for (const bill of billsDocs) {
            const billTotal = Number(bill.total || bill.amount) || 0;
            const bNo = String(bill.invoice || bill.billNo || '').trim().toLowerCase();
            const directPaid = billSpecificMap[bNo] || 0;

            let billPaid = directPaid;
            const unappliedAfterDirect = Math.max(0, billTotal - directPaid);

            if (remainingGeneral > 0 && unappliedAfterDirect > 0) {
                const generalForThisBill = Math.min(unappliedAfterDirect, remainingGeneral);
                billPaid += generalForThisBill;
                remainingGeneral -= generalForThisBill;
            }

            const newStatus = billPaid >= billTotal ? "Paid" : (billPaid > 0 ? "Partial" : "Unpaid");
            
            if (bill.paidAmount !== billPaid || bill.status !== newStatus) {
                await db.collection("bills").doc(bill.id || bill._id.toString()).update({
                    paidAmount: Number(billPaid.toFixed(2)),
                    status: newStatus
                });
            }
        }
        await delCache("bills");
        try {
            const { emitDataUpdated } = require("./socket");
            emitDataUpdated("bills");
        } catch (err) {
            console.error("Socket emit failed for bills", err);
        }
    }
    else if (partyType === 'Vendor') {
        const cashDocs = await db.mongoDb.collection("cashEntries").find({
            partyType: "Vendor",
            partyName: { $regex: regex }
        }).toArray();

        // Separate Direct Purchase-Tagged Payments vs General Payments
        const purchaseSpecificMap = {};
        let generalPaid = 0;

        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            const netAmt = (doc.type === "out") ? amt : -amt;
            const bNo = String(doc.billNo || '').trim().toLowerCase();
            if (bNo && bNo !== 'none' && bNo !== 'general' && bNo !== 'undefined' && bNo !== 'null') {
                purchaseSpecificMap[bNo] = (purchaseSpecificMap[bNo] || 0) + netAmt;
            } else {
                generalPaid += netAmt;
            }
        });

        // 1. Clear Prior Opening Outstanding FIRST with General Payments
        const openDoc = await db.mongoDb.collection("openingBalances").findOne({
            partyType: "Vendor",
            partyName: { $regex: regex }
        });

        let remainingGeneral = generalPaid;
        let openingPaid = 0;

        if (openDoc) {
            const openBilled = Number(openDoc.totalBilledPrior || openDoc.openingOutstanding) || 0;
            const openTds = Number(openDoc.totalTdsPrior) || 0;
            const openDebt = Number(openDoc.totalDebtPrior) || 0;
            const maxPayable = Math.max(0, openBilled - openTds - openDebt);

            openingPaid = remainingGeneral > 0 ? Math.min(maxPayable, remainingGeneral) : 0;
            remainingGeneral -= openingPaid;

            const newOpeningDue = Number((openBilled - openingPaid - openTds - openDebt).toFixed(2));
            await db.collection("openingBalances").doc(openDoc.id || openDoc._id.toString()).update({
                totalPaidPrior: Number(openingPaid.toFixed(2)),
                openingOutstanding: newOpeningDue,
                updatedAt: new Date().toISOString()
            });
        }

        // 2. Cascade Remaining General Payments + Direct Payments to Purchases
        const purchasesDocs = await db.mongoDb.collection("purchases").find({
            vendor: { $regex: regex }
        }).toArray();
        
        purchasesDocs.sort((a, b) => {
            const parseBill = (bill) => {
                const billNo = bill.billNo || "";
                const parts = billNo.split('/');
                if (parts.length >= 3) {
                    const yearPart = parts[1];
                    const seqPart = parts[2];
                    let yearStart = 0;
                    if (yearPart.includes('-')) {
                        const yearStr = yearPart.split('-')[0];
                        yearStart = parseInt(yearStr, 10) || 0;
                        if (yearStart < 100) yearStart += 2000;
                    } else {
                        yearStart = parseInt(yearPart, 10) || 0;
                    }
                    const sequence = parseInt(seqPart, 10) || 0;
                    return { hasFormat: true, yearStart, sequence };
                }
                const dateVal = new Date(bill.createdAt || bill.date || 0);
                const yearVal = dateVal.getFullYear() || 9999;
                return { hasFormat: false, yearStart: yearVal, sequence: 0 };
            };

            const infoA = parseBill(a);
            const infoB = parseBill(b);

            if (infoA.yearStart !== infoB.yearStart) {
                return infoA.yearStart - infoB.yearStart;
            }
            if (infoA.hasFormat && infoB.hasFormat) {
                if (infoA.sequence !== infoB.sequence) {
                    return infoA.sequence - infoB.sequence;
                }
            }
            return new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0);
        });

        for (const purchase of purchasesDocs) {
            const purchaseTotal = Number(purchase.total || purchase.amount) || 0;
            const bNo = String(purchase.billNo || '').trim().toLowerCase();
            const directPaid = purchaseSpecificMap[bNo] || 0;

            let purchasePaid = directPaid;
            const unappliedAfterDirect = Math.max(0, purchaseTotal - directPaid);

            if (remainingGeneral > 0 && unappliedAfterDirect > 0) {
                const generalForThisBill = Math.min(unappliedAfterDirect, remainingGeneral);
                purchasePaid += generalForThisBill;
                remainingGeneral -= generalForThisBill;
            }

            const newStatus = purchasePaid >= purchaseTotal ? "Paid" : (purchasePaid > 0 ? "Partial" : "Unpaid");
            
            if (purchase.paidAmount !== purchasePaid || purchase.status !== newStatus) {
                await db.collection("purchases").doc(purchase.id || purchase._id.toString()).update({
                    paidAmount: Number(purchasePaid.toFixed(2)),
                    status: newStatus
                });
            }
        }
        await delCache("purchases");
        try {
            const { emitDataUpdated } = require("./socket");
            emitDataUpdated("purchases");
        } catch (err) {
            console.error("Socket emit failed for purchases", err);
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

    try {
        runAnalyticsAggregation();
    } catch (e) {
        console.error("Auto analytics sync failed", e);
    }
};

module.exports = { recalculatePartyPayments };
