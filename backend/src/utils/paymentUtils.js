const { db } = require("../config/database");
const { delCache } = require("../config/redis");
const { runAnalyticsAggregation } = require("../jobs/analyticsJob");

const recalculatePartyPayments = async (partyType, partyName) => {
    if (!partyType || !partyName) return;

    if (partyType === 'Client') {
        const cashSnapshot = await db.collection("cashEntries")
            .where("partyType", "==", "Client")
            .where("partyName", "==", partyName)
            .get();
        let totalPaid = 0;
        cashSnapshot.forEach(doc => {
            const data = doc.data();
            const amt = Number(data.amount) || 0;
            if (data.type === "in") totalPaid += amt;
            else if (data.type === "out") totalPaid -= amt;
        });

        const billsSnapshot = await db.collection("bills")
            .where("client", "==", partyName)
            .get();
        let bills = [];
        billsSnapshot.forEach(doc => bills.push({ id: doc.id, ref: doc.ref, data: doc.data() }));
        bills.sort((a, b) => new Date(a.data.createdAt || 0) - new Date(b.data.createdAt || 0));

        let remaining = totalPaid;
        for (const bill of bills) {
            const billTotal = Number(bill.data.total || bill.data.amount) || 0;
            const applied = Math.min(billTotal, remaining);
            remaining -= applied;
            
            const newStatus = applied >= billTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (bill.data.paidAmount !== applied || bill.data.status !== newStatus) {
                await bill.ref.update({ paidAmount: applied, status: newStatus });
            }
        }
        await delCache("bills");
    } 
    else if (partyType === 'Vendor') {
        const cashSnapshot = await db.collection("cashEntries")
            .where("partyType", "==", "Vendor")
            .where("partyName", "==", partyName)
            .get();
        let totalPaid = 0;
        cashSnapshot.forEach(doc => {
            const data = doc.data();
            const amt = Number(data.amount) || 0;
            if (data.type === "out") totalPaid += amt;
            else if (data.type === "in") totalPaid -= amt;
        });

        const purchasesSnapshot = await db.collection("purchases")
            .where("vendor", "==", partyName)
            .get();
        let purchases = [];
        purchasesSnapshot.forEach(doc => purchases.push({ id: doc.id, ref: doc.ref, data: doc.data() }));
        purchases.sort((a, b) => new Date(a.data.createdAt || 0) - new Date(b.data.createdAt || 0));

        let remaining = totalPaid;
        for (const purchase of purchases) {
            const purchaseTotal = Number(purchase.data.total) || 0;
            const applied = Math.min(purchaseTotal, remaining);
            remaining -= applied;
            
            const newStatus = applied >= purchaseTotal ? "Paid" : (applied > 0 ? "Partial" : "Unpaid");
            
            if (purchase.data.paidAmount !== applied || purchase.data.status !== newStatus) {
                await purchase.ref.update({ paidAmount: applied, status: newStatus });
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
