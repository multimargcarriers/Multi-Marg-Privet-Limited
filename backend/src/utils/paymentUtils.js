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

        let totalPaid = 0;
        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            if (doc.type === "in") totalPaid += amt;
            else if (doc.type === "out") totalPaid -= amt;
        });

        const billsDocs = await db.mongoDb.collection("bills").find({
            client: { $regex: regex }
        }).toArray();
        
        billsDocs.sort((a, b) => {
            const parseBill = (bill) => {
                const billNo = bill.billNo || "";
                const parts = billNo.split('/');
                if (parts.length >= 3) {
                    const yearPart = parts[1]; // "25-26" or "2025-2026"
                    const seqPart = parts[2]; // "0247"
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

        let remaining = totalPaid;
        for (const bill of billsDocs) {
            const billTotal = Number(bill.total || bill.amount) || 0;
            const applied = remaining > 0 ? Math.min(billTotal, remaining) : 0;
            remaining -= applied;
            
            const newStatus = applied >= billTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (bill.paidAmount !== applied || bill.status !== newStatus) {
                await db.collection("bills").doc(bill.id || bill._id.toString()).update({ paidAmount: applied, status: newStatus });
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

        let totalPaid = 0;
        cashDocs.forEach(doc => {
            const amt = Number(doc.amount) || 0;
            if (doc.type === "out") totalPaid += amt;
            else if (doc.type === "in") totalPaid -= amt;
        });

        const purchasesDocs = await db.mongoDb.collection("purchases").find({
            vendor: { $regex: regex }
        }).toArray();
        
        purchasesDocs.sort((a, b) => {
            const parseBill = (bill) => {
                const billNo = bill.billNo || "";
                const parts = billNo.split('/');
                if (parts.length >= 3) {
                    const yearPart = parts[1]; // "25-26" or "2025-2026"
                    const seqPart = parts[2]; // "0247"
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

        let remaining = totalPaid;
        for (const purchase of purchasesDocs) {
            const purchaseTotal = Number(purchase.total) || 0;
            const applied = remaining > 0 ? Math.min(purchaseTotal, remaining) : 0;
            remaining -= applied;
            
            const newStatus = applied >= purchaseTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (purchase.paidAmount !== applied || purchase.status !== newStatus) {
                await db.collection("purchases").doc(purchase.id || purchase._id.toString()).update({ paidAmount: applied, status: newStatus });
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
