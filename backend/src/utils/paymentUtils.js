const { db } = require("../config/database");
const { delCache } = require("../config/redis");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

const recalculatePartyPayments = async (partyType, partyName) => {
    if (!partyType || !partyName) return;

    const regex = new RegExp(`^${partyName}$`, "i");

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
        
        billsDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

        let remaining = totalPaid;
        for (const bill of billsDocs) {
            const billTotal = Number(bill.total || bill.amount) || 0;
            const applied = Math.min(billTotal, remaining);
            remaining -= applied;
            
            const newStatus = applied >= billTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (bill.paidAmount !== applied || bill.status !== newStatus) {
                await db.collection("bills").doc(bill.id || bill._id.toString()).update({ paidAmount: applied, status: newStatus });
            }
        }
        await delCache("bills");
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
        
        purchasesDocs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

        let remaining = totalPaid;
        for (const purchase of purchasesDocs) {
            const purchaseTotal = Number(purchase.total) || 0;
            const applied = Math.min(purchaseTotal, remaining);
            remaining -= applied;
            
            const newStatus = applied >= purchaseTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (purchase.paidAmount !== applied || purchase.status !== newStatus) {
                await db.collection("purchases").doc(purchase.id || purchase._id.toString()).update({ paidAmount: applied, status: newStatus });
            }
        }
        await delCache("purchases");
    }
    
    try {
        runAnalyticsAggregation();
    } catch (e) {
        console.error("Auto analytics sync failed", e);
    }
};

module.exports = { recalculatePartyPayments };
